import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file manually to avoid dependency issues
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) continue;
      
      const parts = cleanLine.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  }
} catch (err) {
  console.warn("⚠️ Não foi possível ler o arquivo .env:", err.message);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no arquivo .env");
  process.exit(1);
}

// Initialize admin client bypassing RLS policies
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function run() {
  console.log("🔍 Buscando todos os casos do banco de dados...");
  const { data: cases, error: fetchError } = await supabase
    .from('cases')
    .select('id, case_number, exam_type, images')
    .order('case_number', { ascending: true });

  if (fetchError) {
    console.error("❌ Erro ao buscar casos:", fetchError.message);
    process.exit(1);
  }

  console.log(`📋 Encontrados ${cases.length} casos. Iniciando análise das imagens...\n`);

  let totalImagesMoved = 0;
  let totalCasesUpdated = 0;

  for (const item of cases) {
    if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
      continue;
    }

    const examType = (item.exam_type || 'RX').toUpperCase();
    const caseNumber = item.case_number;
    let caseUpdated = false;

    // Map to keep track of new image URLs for this case
    const updatedImages = [];

    for (const url of item.images) {
      // Find the relative path inside the bucket
      const bucketMarker = '/radiology-images/';
      const idx = url.indexOf(bucketMarker);
      const currentPath = idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();

      if (!currentPath) {
        updatedImages.push(url);
        continue;
      }

      // Check if already in the structured format, e.g., "TC/123/filename.jpg"
      // Match pattern like EXAM_TYPE/CASE_NUMBER/filename
      const structuredRegex = new RegExp(`^${examType}/\\d+/`, 'i');
      const isAlreadyStructured = structuredRegex.test(currentPath);

      if (isAlreadyStructured) {
        // Already structured correctly, keep it as is
        updatedImages.push(url);
        continue;
      }

      const fileName = currentPath.split('/').pop();
      const targetPath = `${examType}/${caseNumber}/${fileName}`;

      console.log(`🔄 Movendo [Caso #${caseNumber}] ${currentPath} -> ${targetPath}...`);

      try {
        // Try to move/rename the file in Supabase storage
        const { error: moveError } = await supabase.storage
          .from('radiology-images')
          .move(currentPath, targetPath);

        if (moveError) {
          // If move fails, check if the file already exists at targetPath (in case migration was partially run)
          const { data: listData } = await supabase.storage
            .from('radiology-images')
            .list(`${examType}/${caseNumber}`, {
              search: fileName
            });

          const fileExistsAtTarget = listData && listData.some(f => f.name === fileName);

          if (fileExistsAtTarget) {
            console.log(`   ⚠️ O arquivo já existe na pasta de destino. Atualizando URL no banco.`);
            const { data: publicData } = supabase.storage
              .from('radiology-images')
              .getPublicUrl(targetPath);

            updatedImages.push(publicData.publicUrl);
            caseUpdated = true;
            totalImagesMoved++;
          } else {
            console.error(`   ❌ Falha ao mover no storage:`, moveError.message);
            // Fallback to old url so we don't lose the image
            updatedImages.push(url);
          }
        } else {
          // Success: get the new public URL
          const { data: publicData } = supabase.storage
            .from('radiology-images')
            .getPublicUrl(targetPath);

          updatedImages.push(publicData.publicUrl);
          caseUpdated = true;
          totalImagesMoved++;
          console.log(`   ✅ Sucesso!`);
        }
      } catch (ex) {
        console.error(`   ❌ Exceção ao processar imagem:`, ex.message || ex);
        updatedImages.push(url);
      }
    }

    // If any images of this case were moved/updated, save the new array to DB
    if (caseUpdated) {
      const { error: updateError } = await supabase
        .from('cases')
        .update({ images: updatedImages })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Erro ao salvar novas URLs do Caso #${caseNumber} no banco:`, updateError.message);
      } else {
        totalCasesUpdated++;
        console.log(`💾 Caso #${caseNumber} atualizado no banco de dados com as novas URLs!\n`);
      }
    }
  }

  console.log("--------------------------------------------------");
  console.log("🏁 MIGRACAO CONCLUIDA!");
  console.log(`📸 Imagens organizadas/movidas: ${totalImagesMoved}`);
  console.log(`📁 Casos atualizados no banco: ${totalCasesUpdated}`);
  console.log("--------------------------------------------------");
}

run().catch(console.error);

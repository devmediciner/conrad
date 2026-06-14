import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Função manual para ler o arquivo .env se rodar diretamente com node
async function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = await fs.readFile(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove aspas se houver
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  } catch (e) {
    // Ignora se o arquivo .env não existir
  }
}

async function run() {
  await loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // A chave de Service Role é necessária para buckets privados ou ler dados administrativos
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Erro: SUPABASE_URL ou SUPABASE_KEY não configurados.");
    console.log("Por favor, garanta que as variáveis estão no seu arquivo .env.");
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("\n⚠️  AVISO: Usando a chave pública (anon/publishable).");
    console.warn("Arquivos em buckets PRIVADOS podem falhar ao baixar.");
    console.warn("Dica: Adicione 'SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role' no seu arquivo .env para baixar todos os arquivos.\n");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });

  const backupDir = path.join(process.cwd(), 'backup_supabase_storage');
  console.log(`Iniciando backup dos arquivos em: ${backupDir}\n`);

  // 1. Listar todos os buckets do storage
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.error("Erro ao obter a lista de buckets:", bucketError.message);
    return;
  }

  if (!buckets || buckets.length === 0) {
    console.log("Nenhum bucket encontrado no storage.");
    return;
  }

  for (const bucket of buckets) {
    console.log(`\n📁 Processando bucket: "${bucket.name}" (Público: ${bucket.public})`);
    await downloadFolder(supabase, bucket.id, '', backupDir);
  }

  console.log("\n✅ Backup dos arquivos do Storage concluído com sucesso!");
}

async function downloadFolder(supabase, bucketId, folderPath, baseBackupDir) {
  // Listar arquivos no caminho atual
  const { data: items, error: listError } = await supabase.storage
    .from(bucketId)
    .list(folderPath || undefined, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (listError) {
    console.error(`❌ Erro ao listar pasta "${folderPath}" no bucket "${bucketId}":`, listError.message);
    return;
  }

  if (!items || items.length === 0) return;

  for (const item of items) {
    const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

    // No Supabase Storage, se não houver metadata (id, etc) ou se for um placeholder, é considerado uma pasta.
    // Pastas virtuais geralmente não contêm 'id' no metadata.
    const isFolder = !item.id && !item.metadata;

    if (isFolder) {
      console.log(`  📂 Entrando na pasta: ${itemPath}`);
      await downloadFolder(supabase, bucketId, itemPath, baseBackupDir);
    } else {
      console.log(`  📄 Baixando arquivo: ${itemPath} (${(item.metadata?.size / 1024 || 0).toFixed(2)} KB)`);
      
      const { data, error } = await supabase.storage
        .from(bucketId)
        .download(itemPath);

      if (error) {
        console.error(`  ❌ Erro ao baixar "${itemPath}":`, error.message);
        continue;
      }

      // Salvar o arquivo localmente
      const localFilePath = path.join(baseBackupDir, bucketId, itemPath);
      const localDir = path.dirname(localFilePath);

      await fs.mkdir(localDir, { recursive: true });
      const buffer = Buffer.from(await data.arrayBuffer());
      await fs.writeFile(localFilePath, buffer);
    }
  }
}

run().catch(console.error);

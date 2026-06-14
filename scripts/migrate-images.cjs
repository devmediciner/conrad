const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

let serviceAccountPath;

async function run() {
  let serviceAccount;
  try {
    const files = await fs.readdir(process.cwd());
    const adminSdkFile = files.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
    
    if (adminSdkFile) {
      serviceAccountPath = path.join(process.cwd(), adminSdkFile);
      console.log(`🔑 Arquivo de credenciais detectado: ${adminSdkFile}`);
    } else {
      serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    }

    const fileContent = await fs.readFile(serviceAccountPath, 'utf-8');
    serviceAccount = JSON.parse(fileContent);
  } catch (e) {
    console.error("❌ ERRO: O arquivo de credenciais do Firebase (JSON) não foi encontrado na raiz do projeto.");
    process.exit(1);
  }

  let bucketName = `${serviceAccount.project_id}.firebasestorage.app`;

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: bucketName
  });

  const db = getFirestore();
  let bucket = getStorage().bucket();

  console.log("📤 Iniciando envio de imagens para o Firebase Storage...\n");

  // Testa se o bucket padrão do Firebase existe
  try {
    const [exists] = await bucket.exists();
    if (!exists) throw new Error("Bucket não encontrado");
    console.log(`📁 Usando bucket padrão do Firebase: ${bucketName}`);
  } catch (e) {
    bucketName = `${serviceAccount.project_id}.appspot.com`;
    bucket = getStorage().bucket(bucketName);
    try {
      const [exists] = await bucket.exists();
      if (!exists) throw new Error("Bucket não encontrado");
      console.log(`📁 Usando bucket legado (legacy): ${bucketName}`);
    } catch (e2) {
      console.error(`❌ ERRO: O bucket de Storage do Firebase não pôde ser acessado.`);
      console.error(`Tentamos os seguintes nomes:`);
      console.error(`  - ${serviceAccount.project_id}.firebasestorage.app`);
      console.error(`  - ${serviceAccount.project_id}.appspot.com`);
      console.log("\nMotivos possíveis:");
      console.log("1. Você ainda não ativou o 'Storage' no console do seu Firebase.");
      console.log("2. O Firebase agora exige que o projeto esteja no plano Blaze (que tem cota de 5GB grátis mas pede um cartão de crédito cadastrado) para ativar o Storage.");
      console.log("\nComo ativar:");
      console.log("1. Acesse o console do Firebase -> 'Storage' no menu lateral.");
      console.log("2. Clique em 'Primeiros passos' (se pedir para migrar para o plano Blaze, siga as etapas no console para associar uma forma de pagamento).");
      process.exit(1);
    }
  }

  const storageBackupDir = path.join(process.cwd(), 'backup_supabase_storage');
  const urlMap = {};

  // 1. Processar radiology-images
  const radDir = path.join(storageBackupDir, 'radiology-images');
  try {
    const files = await fs.readdir(radDir);
    console.log(`📸 Enviando ${files.length} imagens de radiologia...`);
    for (const file of files) {
      const localPath = path.join(radDir, file);
      const remotePath = `radiology-images/${file}`;
      
      console.log(`   - Enviando ${file}...`);
      await bucket.upload(localPath, {
        destination: remotePath,
        public: true,
        metadata: { contentType: 'image/jpeg' }
      });

      const newUrl = `https://storage.googleapis.com/${bucketName}/${remotePath}`;
      const oldUrl = `https://iqjtknseqodoyklavxyg.supabase.co/storage/v1/object/public/radiology-images/${file}`;
      urlMap[oldUrl] = newUrl;
    }
  } catch (err) {
    console.log("⚠️  Erro no radiology-images:", err.message);
  }

  // 2. Processar articles images
  const artDir = path.join(storageBackupDir, 'images', 'articles');
  try {
    const files = await fs.readdir(artDir);
    console.log(`\n📰 Enviando ${files.length} imagens de artigos...`);
    for (const file of files) {
      const localPath = path.join(artDir, file);
      const remotePath = `articles/${file}`;
      
      console.log(`   - Enviando ${file}...`);
      const ext = file.split('.').pop().toLowerCase();
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      
      await bucket.upload(localPath, {
        destination: remotePath,
        public: true,
        metadata: { contentType }
      });

      const newUrl = `https://storage.googleapis.com/${bucketName}/${remotePath}`;
      const oldUrl1 = `https://iqjtknseqodoyklavxyg.supabase.co/storage/v1/object/public/images/articles/${file}`;
      const oldUrl2 = `https://iqjtknseqodoyklavxyg.supabase.co/storage/v1/object/public/images/${file}`;
      urlMap[oldUrl1] = newUrl;
      urlMap[oldUrl2] = newUrl;
    }
  } catch (err) {
    console.log("⚠️  Erro no articles images:", err.message);
  }

  console.log("\n🔄 Atualizando links de imagens no Firestore...");

  // 3. Atualizar coleção de cases no Firestore
  console.log("📁 Atualizando coleção de casos (cases)...");
  const casesSnapshot = await db.collection('cases').get();
  for (const doc of casesSnapshot.docs) {
    const caseData = doc.data();
    let updated = false;

    if (caseData.images && Array.isArray(caseData.images)) {
      const newImages = caseData.images.map(imgUrl => {
        if (urlMap[imgUrl]) {
          updated = true;
          return urlMap[imgUrl];
        }
        return imgUrl;
      });

      if (updated) {
        await doc.ref.update({ images: newImages });
        console.log(`   ✅ Caso #${caseData.case_number} (${doc.id}) atualizado.`);
      }
    }
  }

  // 4. Atualizar coleção de articles no Firestore
  console.log("📁 Atualizando coleção de artigos (articles)...");
  const articlesSnapshot = await db.collection('articles').get();
  for (const doc of articlesSnapshot.docs) {
    const articleData = doc.data();
    let updated = false;
    const updates = {};

    if (articleData.imagem_capa && urlMap[articleData.imagem_capa]) {
      updates.imagem_capa = urlMap[articleData.imagem_capa];
      updated = true;
    }

    if (articleData.conteudo) {
      let content = articleData.conteudo;
      for (const [oldUrl, newUrl] of Object.entries(urlMap)) {
        if (content.includes(oldUrl)) {
          content = content.split(oldUrl).join(newUrl);
          updated = true;
        }
      }
      if (updated) {
        updates.conteudo = content;
      }
    }

    if (updated) {
      await doc.ref.update(updates);
      console.log(`   ✅ Artigo "${articleData.titulo}" (${doc.id}) atualizado.`);
    }
  }

  console.log("\n✅ Todas as imagens foram migradas e os links no Firestore atualizados!");
}

run().catch(console.error);

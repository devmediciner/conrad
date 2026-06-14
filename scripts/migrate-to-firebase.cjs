const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
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
    console.log("\nComo obter este arquivo:");
    console.log("1. Acesse o console do Firebase: https://console.firebase.google.com/");
    console.log("2. Selecione seu projeto.");
    console.log("3. Vá em 'Configurações do Projeto' (ícone de engrenagem no menu lateral) -> 'Contas de serviço'.");
    console.log("4. Clique em 'Gerar nova chave privada'.");
    console.log("5. Salve o arquivo baixado na raiz da sua pasta local.");
    console.log("\nDepois disso:");
    console.log("6. Instale os pacotes de migração rodando: npm install firebase-admin dotenv");
    console.log("7. Execute este script novamente: node scripts/migrate-to-firebase.cjs\n");
    process.exit(1);
  }

  // Inicializa o Admin SDK
  initializeApp({
    credential: cert(serviceAccount)
  });

  const auth = getAuth();
  const db = getFirestore();

  const backupDir = path.join(process.cwd(), 'backup_supabase_db');

  console.log("🚀 Iniciando migração de dados para o Firebase...\n");

  // 1. Migrar Usuários (Auth)
  console.log("👤 Migrando usuários para o Firebase Auth...");
  let users = [];
  try {
    const usersData = await fs.readFile(path.join(backupDir, 'auth_users.json'), 'utf-8');
    users = JSON.parse(usersData);
  } catch (e) {
    console.log("⚠️  Aviso: Nenhum arquivo 'auth_users.json' encontrado. Pulando migração de usuários.");
  }

  for (const user of users) {
    try {
      await auth.getUser(user.id);
      console.log(`   - Usuário ${user.email} já existe no Firebase Auth.`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        try {
          await auth.createUser({
            uid: user.id,
            email: user.email,
            emailVerified: true,
            password: 'Conrad123!', // Senha padrão temporária para os membros
          });
          console.log(`   ✅ Usuário ${user.email} criado com sucesso (UID original mantido).`);
        } catch (createError) {
          console.error(`   ❌ Erro ao criar usuário ${user.email}:`, createError.message);
        }
      } else {
        console.error(`   ❌ Erro ao verificar usuário ${user.email}:`, error.message);
      }
    }
  }

  // 2. Migrar coleções
  await migrateCollection(db, backupDir, 'user_roles', 'user_roles.json');
  await migrateCollection(db, backupDir, 'cases', 'cases.json');
  await migrateCollection(db, backupDir, 'articles', 'articles.json');
  await migrateCollection(db, backupDir, 'diseases', 'diseases.json');

  console.log("\n🎉 Migração concluída com sucesso!");
  console.log("\n🔔 Lembre-se:");
  console.log("1. Os usuários migrados devem logar usando a senha padrão 'Conrad123!' no primeiro acesso.");
  console.log("2. Agora você deve fazer o upload das imagens locais da pasta 'backup_supabase_storage' para os seus respectivos buckets do Firebase Storage.");
}

async function migrateCollection(db, backupDir, collectionName, jsonFileName) {
  console.log(`\n📊 Migrando coleção "${collectionName}"...`);
  let items = [];
  try {
    const fileContent = await fs.readFile(path.join(backupDir, jsonFileName), 'utf-8');
    items = JSON.parse(fileContent);
  } catch (e) {
    console.log(`   ⚠️  Aviso: Arquivo '${jsonFileName}' não encontrado. Pulando.`);
    return;
  }

  const batch = db.batch();
  const collectionRef = db.collection(collectionName);

  let count = 0;
  for (const item of items) {
    // Mantemos o ID do documento igual ao ID original para preservar as relações
    const docId = item.id || `auto-${Math.random().toString(36).substring(7)}`;
    const { id, ...data } = item;
    
    const docRef = collectionRef.doc(String(docId));
    batch.set(docRef, data);
    count++;
  }

  if (count > 0) {
    await batch.commit();
    console.log(`   ✅ ${count} documentos importados para a coleção "${collectionName}".`);
  } else {
    console.log(`   Nenhum documento encontrado para a coleção "${collectionName}".`);
  }
}

run().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Função manual para ler o arquivo .env
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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no seu arquivo .env.");
    console.log("Para fazer backup do banco de dados (especialmente os logins), a chave service_role é obrigatória.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });

  const backupDir = path.join(process.cwd(), 'backup_supabase_db');
  await fs.mkdir(backupDir, { recursive: true });

  console.log(`Iniciando backup do Banco de Dados (JSON) em: ${backupDir}\n`);

  // 1. Backup de Logins (Usuários) usando a API de Admin
  console.log("👤 Baixando lista de usuários (logins)...");
  let allUsers = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      console.error("❌ Erro ao baixar usuários:", error.message);
      break;
    }

    if (!data || !data.users || data.users.length === 0) {
      break;
    }

    allUsers = allUsers.concat(data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  await fs.writeFile(
    path.join(backupDir, 'auth_users.json'), 
    JSON.stringify(allUsers, null, 2), 
    'utf-8'
  );
  console.log(`✅ ${allUsers.length} usuários (logins) salvos em 'auth_users.json'.`);

  // 2. Backup das tabelas públicas
  const tables = ['cases', 'user_roles', 'articles', 'diseases'];

  for (const table of tables) {
    console.log(`📊 Baixando registros da tabela "${table}"...`);
    const { data: rows, error: tableError } = await supabase
      .from(table)
      .select('*');

    if (tableError) {
      console.error(`❌ Erro ao baixar dados da tabela ${table}:`, tableError.message);
      continue;
    }

    await fs.writeFile(
      path.join(backupDir, `${table}.json`),
      JSON.stringify(rows || [], null, 2),
      'utf-8'
    );
    console.log(`✅ ${rows?.length || 0} registros salvos em '${table}.json'.`);
  }

  console.log("\n✅ Backup do Banco de Dados concluído com sucesso!");
}

run().catch(console.error);

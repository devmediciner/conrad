import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://iqjtknseqodoyklavxyg.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxanRrbnNlcW9kb3lrbGF2eHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQyODcsImV4cCI6MjA5MTEzMDI4N30.ExD3obWtNR4OPBe5HVymv783dUH4TOg2nZZjl8YUfLM';
const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default async function handler(req, res) {
  const { type, id } = req.query;

  let title = 'GALERIA - CONRAD';
  let description = 'Galeria radiológica da liga acadêmica de radiologia da UFSJ - CCO';
  let imageUrl = 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f39c610d-4f06-4685-872f-720b9a64baf0/id-preview-b7e141a3--1f40dbe6-9885-49f3-868f-e143f857182a.lovable.app-1775053692443.png';

  try {
    if (type === 'caso' && id) {
      let data = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        const { data: byId } = await supabase
          .from('cases')
          .select('*')
          .eq('id', id)
          .single();
        data = byId;
      } else {
        const num = parseInt(id, 10);
        if (!isNaN(num)) {
          const { data: byNum } = await supabase
            .from('cases')
            .select('*')
            .eq('case_number', num)
            .single();
          data = byNum;
        }
      }

      if (data) {
        title = `Caso #${data.case_number} - Galeria Radiológica CONRAD`;
        description = stripHtml(data.clinical_case).substring(0, 150) + '...';
        if (data.images && data.images[0]) {
          imageUrl = data.images[0];
        }
      }
    } else if (type === 'artigo' && id) {
      let data = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      if (isUUID) {
        const { data: byId } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();
        data = byId;
      } else {
        const { data: allArticles } = await supabase
          .from('articles')
          .select('*');
        if (allArticles) {
          data = allArticles.find(a => slugify(a.titulo) === id) || null;
        }
      }

      if (data) {
        title = `${data.titulo} - CONRAD`;
        description = stripHtml(data.conteudo).substring(0, 150) + '...';
        if (data.imagem_capa) {
          imageUrl = data.imagem_capa;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching preview data:', error);
  }

  // Load the index.html template (dist/index.html in production, fallback to index.html in dev)
  let htmlContent = '';
  try {
    const distPath = path.join(process.cwd(), 'dist', 'index.html');
    const rootPath = path.join(process.cwd(), 'index.html');
    
    if (fs.existsSync(distPath)) {
      htmlContent = fs.readFileSync(distPath, 'utf8');
    } else if (fs.existsSync(rootPath)) {
      htmlContent = fs.readFileSync(rootPath, 'utf8');
    } else {
      return res.status(500).send('Template HTML não encontrado.');
    }
  } catch (err) {
    console.error('Erro ao ler index.html:', err);
    return res.status(500).send('Erro interno ao ler template.');
  }

  // Replace titles and descriptions and images
  htmlContent = htmlContent
    .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
    .replace(/<meta property="og:title" content=".*?"\s*\/?>/g, `<meta property="og:title" content="${title}">`)
    .replace(/<meta name="twitter:title" content=".*?"\s*\/?>/g, `<meta name="twitter:title" content="${title}">`)
    
    .replace(/<meta name="description" content=".*?"\s*\/?>/g, `<meta name="description" content="${description}">`)
    .replace(/<meta property="og:description" content=".*?"\s*\/?>/g, `<meta property="og:description" content="${description}">`)
    .replace(/<meta name="twitter:description" content=".*?"\s*\/?>/g, `<meta name="twitter:description" content="${description}">`)
    
    .replace(/<meta property="og:image" content=".*?"\s*\/?>/g, `<meta property="og:image" content="${imageUrl}">`)
    .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/g, `<meta name="twitter:image" content="${imageUrl}">`);

  res.setHeader('Content-Type', 'text/html');
  return res.send(htmlContent);
}

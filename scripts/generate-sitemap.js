import fs from 'fs';
import path from 'path';

// Função slugify idêntica à do frontend para manter consistência nos links
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

const BASE_URL = 'https://conradufsj.app';

async function generateSitemap() {
  console.log('🤖 Gerando sitemap.xml...');

  const staticUrls = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/artigos', changefreq: 'weekly', priority: '0.8' },
    { loc: '/game', changefreq: 'weekly', priority: '0.8' },
    { loc: '/sobre', changefreq: 'monthly', priority: '0.7' },
    { loc: '/privacidade', changefreq: 'monthly', priority: '0.5' },
  ];

  const dynamicUrls = [];

  // 1. Carregar Artigos aprovados do backup
  try {
    const articlesPath = path.join(process.cwd(), 'backup_supabase_db', 'articles.json');
    if (fs.existsSync(articlesPath)) {
      const articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
      const approvedArticles = articlesData.filter(a => a.status === 'approved');
      
      for (const article of approvedArticles) {
        const slug = slugify(article.titulo);
        if (slug) {
          dynamicUrls.push({
            loc: `/artigo/${slug}`,
            changefreq: 'weekly',
            priority: '0.8',
            lastmod: article.updated_at || article.created_at || new Date().toISOString()
          });
        }
      }
      console.log(`✅ Adicionados ${approvedArticles.length} artigos ao sitemap.`);
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível ler ou processar backup_supabase_db/articles.json:', err.message);
  }

  // 2. Carregar Casos aprovados do backup
  try {
    const casesPath = path.join(process.cwd(), 'backup_supabase_db', 'cases.json');
    if (fs.existsSync(casesPath)) {
      const casesData = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
      const approvedCases = casesData.filter(c => c.status === 'approved');
      
      for (const c of approvedCases) {
        if (c.case_number) {
          dynamicUrls.push({
            loc: `/caso/${c.case_number}`,
            changefreq: 'weekly',
            priority: '0.8',
            lastmod: c.updated_at || c.created_at || new Date().toISOString()
          });
        }
      }
      console.log(`✅ Adicionados ${approvedCases.length} casos clínicos ao sitemap.`);
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível ler ou processar backup_supabase_db/cases.json:', err.message);
  }

  // Combinar todas as URLs
  const allUrls = [...staticUrls, ...dynamicUrls];

  // Construir XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of allUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${url.loc}</loc>\n`;
    if (url.lastmod) {
      // Formatar data para YYYY-MM-DD
      const dateStr = new Date(url.lastmod).toISOString().split('T')[0];
      xml += `    <lastmod>${dateStr}</lastmod>\n`;
    }
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  // Salvar na pasta public/
  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`🎉 Sitemap gerado com sucesso em: ${outputPath}`);
}

generateSitemap().catch(console.error);

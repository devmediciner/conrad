export interface Article {
  id: string;
  titulo: string;
  categoria: string;
  autor: string;
  data_publicacao: string;
  imagem_capa: string | null;
  conteudo: string;
  status: 'pending' | 'approved' | 'rejected';
  related_cases_ids: string[] | null;
  created_at: string;
}

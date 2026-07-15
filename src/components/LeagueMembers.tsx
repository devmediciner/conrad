import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const getInitials = (name: string) => {
  if (!name) return '';
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const LeagueMembers = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('league_members')
          .select('*')
          .order('order_index', { ascending: true });

        if (error) throw error;
        if (data) setMembers(data);
      } catch (err) {
        console.error('Erro ao buscar membros:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <p className="text-muted-foreground text-sm">Carregando membros da liga...</p>
        </div>
      </section>
    );
  }

  // Se não houver membros no banco, exibe nada ou um aviso
  if (members.length === 0) {
    return null;
  }

  const isDiretoria = (role: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    if (r.includes('presidente') || r.includes('diretor') || r.includes('coordenador') || r.includes('secretári') || r.includes('tesoureir')) {
      return true;
    }
    if (r.includes('membro')) {
      return false;
    }
    return true;
  };

  const diretoria = members.filter(m => isDiretoria(m.role));
  const outrosMembros = members.filter(m => !isDiretoria(m.role));

  const renderMember = (member: any) => (
    <div key={member.id} className="flex flex-col items-center group">
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mb-4 overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center transition-all duration-300 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(232,163,61,0.2)]">
        {member.image_url ? (
          <img
            src={member.image_url}
            alt={member.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            {getInitials(member.name)}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm sm:text-base text-foreground text-center mb-1">
        {member.name}
      </h3>
      <p className="text-xs font-medium text-primary mb-1 text-center">
        {member.role}
      </p>
      <p className="text-xs text-muted-foreground text-center">
        {member.turma}
      </p>
    </div>
  );

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-xs mx-auto';
    if (count === 2) return 'grid-cols-2 max-w-2xl mx-auto';
    if (count === 3) return 'grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto';
    if (count === 4) return 'grid-cols-2 md:grid-cols-4 max-w-5xl mx-auto';
    if (count === 5) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-5xl mx-auto';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            Integrantes da Liga
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Conheça a equipe por trás da CONRAD, dedicada a aprofundar e compartilhar o conhecimento em Radiologia e Diagnóstico por Imagem na UFSJ.
          </p>
        </div>

        {diretoria.length > 0 && (
          <div className="mb-12">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-center mb-8 text-primary/80 uppercase tracking-wider">Diretoria</h3>
            <div className={`grid gap-6 ${getGridClass(diretoria.length)}`}>
              {diretoria.map(renderMember)}
            </div>
          </div>
        )}

        {outrosMembros.length > 0 && (
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-center mb-8 text-primary/80 uppercase tracking-wider">Membros</h3>
            <div className={`grid gap-6 ${getGridClass(outrosMembros.length)}`}>
              {outrosMembros.map(renderMember)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

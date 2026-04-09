import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/authContent';
import { Menu, X, LogOut, Shield } from 'lucide-react';
import logo from '@/assets/logo.png';

interface NavbarProps {
  onSubmitClick: () => void;
}

export function Navbar({ onSubmitClick }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Galeria Radiológica" width={36} height={36} className="rounded-lg" />
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-foreground text-sm">Galeria Radiológica</span>
            <span className="block text-[10px] text-muted-foreground leading-tight">Liga de Radiologia — UFSJ CCO</span>
          </div>
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onSubmitClick}>
            Enviar caso
          </Button>
          <Link to="/sobre" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sobre
          </Link>
          <a href="#contato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Contato
          </a>
          <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacidade
          </Link>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <Shield className="w-4 h-4 mr-1" /> Admin
            </Button>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
          <Button variant="ghost" className="w-full justify-start" onClick={() => { onSubmitClick(); setMenuOpen(false); }}>
            Enviar caso
          </Button>
          <Link to="/sobre" className="block text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>Sobre</Link>
          <a href="#contato" className="block text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>Contato</a>
          <Link to="/privacidade" className="block text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>Privacidade</Link>
          {isAdmin && (
            <Button variant="outline" className="w-full justify-start" onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
              <Shield className="w-4 h-4 mr-1" /> Admin
            </Button>
          )}
          {user ? (
            <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          ) : (
            <Button variant="outline" className="w-full justify-start" onClick={() => { navigate('/login'); setMenuOpen(false); }}>
              Login
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}

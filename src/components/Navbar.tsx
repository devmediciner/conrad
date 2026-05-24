import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/authContent';
import { Menu, X, LogOut, Shield, User, Activity } from 'lucide-react';
import logo from '@/assets/logo.png';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-black/10' : ''}`}>
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
          <Link to="/sobre" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sobre
          </Link>
          <a href="#contato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Contato
          </a>
          <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacidade
          </Link>
          <Link to="/game" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Quiz
          </Link>
          {user && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              {isAdmin ? <Shield className="w-4 h-4 mr-1" /> : <User className="w-4 h-4 mr-1" />} Painel
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
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <Link to="/sobre" className="block text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>Sobre</Link>
              <a href="#contato" className="block text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>Contato</a>
              <Link to="/privacidade" className="block text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>Privacidade</Link>
              <Link to="/game" className="flex items-center gap-1.5 text-sm text-muted-foreground px-4 py-2" onClick={() => setMenuOpen(false)}>
                <Activity className="w-4 h-4" /> Quiz
              </Link>
              {user && (
                <Button variant="outline" className="w-full justify-start" onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
                  {isAdmin ? <Shield className="w-4 h-4 mr-1" /> : <User className="w-4 h-4 mr-1" />} Painel
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
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

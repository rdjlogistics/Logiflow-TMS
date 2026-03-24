import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatGPTPanel } from '@/components/chatgpt/ChatGPTPanel';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { ChatContext } from '@/hooks/useChatGPT';
import { Loader2, Lock, ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ChatGPT = () => {
  const { user, loading } = useAuth();
  const { role, canAccessChatGPT, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [context, setContext] = useState<ChatContext>({});

  useEffect(() => {
    const state = location.state as any;
    
    setContext({
      currentPage: 'ChatGPT',
      selectedOrders: state?.selectedOrders || [],
      filters: state?.filters || {},
      dateRange: state?.dateRange || {},
      userRole: role === 'admin' ? 'Admin' : 'Medewerker'
    });
  }, [location.state, role]);

  if (loading || roleLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Toegang geweigerd</h2>
          <p className="text-muted-foreground text-sm">
            Je moet ingelogd zijn om de AI assistent te gebruiken.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Inloggen
          </Button>
        </div>
      </div>
    );
  }

  if (!canAccessChatGPT) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Geen toegang</h2>
          <p className="text-muted-foreground text-sm">
            De AI assistent is alleen beschikbaar voor Admins en Planners.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden">
      <ChatGPTPanel context={context} />
    </div>
  );
};

export default ChatGPT;

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-xl",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:border-border/50 group-[.toaster]:border",
            "group-[.toaster]:shadow-[0_8px_32px_-8px_hsl(var(--foreground)/0.15)]",
            "group-[.toaster]:rounded-xl",
            "group-[.toaster]:p-4",
          ].join(" "),
          title: "group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: [
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            "group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
            "group-[.toast]:font-medium group-[.toast]:text-sm",
            "group-[.toast]:transition-all group-[.toast]:hover:bg-primary/90",
          ].join(" "),
          cancelButton: [
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            "group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
            "group-[.toast]:font-medium group-[.toast]:text-sm",
          ].join(" "),
          closeButton: [
            "group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground",
            "group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-muted",
            "group-[.toast]:rounded-lg group-[.toast]:transition-colors",
          ].join(" "),
          success: [
            "group-[.toaster]:border-success/30",
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-success/10 group-[.toaster]:to-transparent",
          ].join(" "),
          error: [
            "group-[.toaster]:border-destructive/30",
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-destructive/10 group-[.toaster]:to-transparent",
          ].join(" "),
          warning: [
            "group-[.toaster]:border-warning/30",
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-warning/10 group-[.toaster]:to-transparent",
          ].join(" "),
          info: [
            "group-[.toaster]:border-info/30",
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-info/10 group-[.toaster]:to-transparent",
          ].join(" "),
        },
      }}
      icons={{
        success: <CheckCircle className="h-5 w-5 text-success" />,
        error: <XCircle className="h-5 w-5 text-destructive" />,
        warning: <AlertTriangle className="h-5 w-5 text-warning" />,
        info: <Info className="h-5 w-5 text-info" />,
        loading: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
      }}
      {...props}
    />
  );
};

// Premium toast helpers
const showToast = {
  success: (title: string, description?: string) => 
    toast.success(title, { description }),
  error: (title: string, description?: string) => 
    toast.error(title, { description }),
  warning: (title: string, description?: string) => 
    toast.warning(title, { description }),
  info: (title: string, description?: string) => 
    toast.info(title, { description }),
  loading: (title: string, description?: string) => 
    toast.loading(title, { description }),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => toast.promise(promise, messages),
  dismiss: (id?: string | number) => toast.dismiss(id),
  custom: (jsx: React.ReactElement) => toast.custom(() => jsx),
};

export { Toaster, toast, showToast };

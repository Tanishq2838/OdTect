import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative"
      >
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative bg-card p-6 rounded-full shadow-xl border border-border">
          <FileQuestion className="h-16 w-16 text-primary" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-md space-y-4"
      >
        <h1 className="text-4xl font-bold font-heading text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground text-lg">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="pt-4">
          <Button asChild size="lg" className="shadow-medical hover:shadow-medical-lg transition-all">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

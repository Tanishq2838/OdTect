import { ReactNode } from "react";
import Header from "./Header";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col font-sans text-foreground bg-background relative selection:bg-primary/20">
            {/* Animated Background Mesh */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50">
                <div className="blob"></div>
                <div className="blob"></div>
                <div className="blob"></div>
                <div className="aurora-bg"></div>
            </div>

            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="py-6 border-t border-border/40 mt-auto bg-background/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>(c) {new Date().getFullYear()} O_Dtect Medical AI. High-precision diagnostic support.</p>
                </div>
            </footer>
        </div>
    );
}

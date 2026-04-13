import { AnimatedPage } from '@flowpigdev/ui';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Layers, Zap, Users, Shield } from 'lucide-react';

export default function IndexRoute() {
  return (
    <AnimatedPage className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Flowpig</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Log in
              </Link>
              <Link 
                to="/signup" 
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight leading-tight"
            >
              Modern project management for{' '}
              <span className="text-primary-500">fast-moving teams</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 text-xl text-gray-600 leading-relaxed"
            >
              Streamline your workflow with powerful issue tracking, collaborative docs, 
              and real-time updates. Built for the way modern teams work.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex items-center justify-center gap-4"
            >
              <Link 
                to="/signup" 
                className="group inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg"
              >
                Start for free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#features" 
                className="text-gray-600 hover:text-gray-900 font-medium px-4 py-4 transition-colors"
              >
                Learn more
              </a>
            </motion.div>
          </div>
        </div>

        {/* Gradient background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-primary-100 via-purple-100 to-pink-100 rounded-full blur-3xl opacity-40" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features to help your team stay organized and ship faster
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6" />}
              title="Lightning Fast"
              description="Built for speed with real-time updates and instant search across all your work."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Team Collaboration"
              description="Work together seamlessly with comments, mentions, and shared workspaces."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />}
              title="Enterprise Security"
              description="Bank-grade security with SSO, audit logs, and granular permissions."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Flowpig</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 Flowpig. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </AnimatedPage>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition-all"
    >
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}

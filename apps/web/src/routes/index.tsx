import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Shield,
  GitBranch,
  BarChart3,
  FileText,
  Inbox,
  Keyboard,
  MessageSquare,
  Clock,
  Target,
  Sparkles,
  Star,
  Play
} from 'lucide-react';

const features = [
  { icon: Target, title: "My Issues Dashboard", description: "Personal todo view with issues grouped by due date, priority, and status." },
  { icon: Inbox, title: "Smart Inbox", description: "Unified notification center with email-style threading." },
  { icon: FileText, title: "Rich Block Editor", description: "Notion-style editor with toggles, callouts, math equations, tables, and embeds." },
  { icon: GitBranch, title: "Git Integration", description: "Auto-link PRs, track commits, and generate branch names from issues." },
  { icon: BarChart3, title: "Analytics & Velocity", description: "Burndown charts, cycle stats, team performance metrics." },
  { icon: Layers, title: "Database Views", description: "Calendar, timeline, gallery, and table views for your databases." },
  { icon: MessageSquare, title: "Page Hierarchy", description: "Nested pages with breadcrumbs, tree navigation, and easy organization." },
  { icon: Keyboard, title: "Keyboard Shortcuts", description: "Cmd+K command palette with global shortcuts." },
  { icon: Shield, title: "Sharing & Permissions", description: "Public pages, access control, invite by email, and granular permissions." },
  { icon: GitBranch, title: "Real-time Sync", description: "Live cursors, presence indicators, and instant updates." },
  { icon: Clock, title: "Cycles & Sprints", description: "Scrum-style sprints with burndown charts and velocity tracking." },
  { icon: Star, title: "AI-Powered", description: "AI-generated issue titles, automatic categorization, and smart suggestions." },
];

const highlights = [
  "Keyboard-first navigation",
  "Dark & light themes", 
  "Offline support",
  "API & webhooks",
  "Import from Jira/Linear",
  "Export to PDF/Markdown",
];

export default function IndexRoute() {
  const styles = {
    page: { minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' },
    nav: { 
      position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e5e7eb'
    },
    navInner: { maxWidth: '72rem', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '3.5rem' },
    logo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    logoIcon: { width: '1.75rem', height: '1.75rem', backgroundColor: '#5E6AD2', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: '1.125rem', fontWeight: 600, color: '#111827' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
    navLink: { fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' },
    navButton: { fontSize: '0.875rem', backgroundColor: '#5E6AD2', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: 500, textDecoration: 'none' },
    hero: { paddingTop: '8rem', paddingBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center' as const },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', backgroundColor: 'rgba(94, 106, 210, 0.1)', border: '1px solid rgba(94, 106, 210, 0.2)', borderRadius: '9999px', fontSize: '0.875rem', color: '#5E6AD2', marginBottom: '1.5rem' },
    heading: { fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700, color: '#111827', marginBottom: '1.5rem', lineHeight: 1.1 },
    accent: { color: '#5E6AD2' },
    subheading: { fontSize: '1.25rem', color: '#6b7280', maxWidth: '42rem', margin: '0 auto 2rem', lineHeight: 1.6 },
    buttonGroup: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const },
    primaryButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#5E6AD2', color: 'white', padding: '0.875rem 1.75rem', borderRadius: '0.5rem', fontWeight: 500, textDecoration: 'none', fontSize: '1rem' },
    secondaryButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', color: '#374151', padding: '0.875rem 1.75rem', borderRadius: '0.5rem', fontWeight: 500, textDecoration: 'none', border: '1px solid #d1d5db' },
    features: { padding: '5rem 1rem', backgroundColor: '#f9fafb' },
    sectionTitle: { textAlign: 'center' as const, marginBottom: '3rem' },
    sectionHeading: { fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' },
    sectionSubheading: { fontSize: '1.125rem', color: '#6b7280', maxWidth: '42rem', margin: '0 auto' },
    featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', maxWidth: '72rem', margin: '0 auto' },
    featureCard: { backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb', transition: 'box-shadow 0.2s' },
    featureIcon: { width: '2.5rem', height: '2.5rem', backgroundColor: 'rgba(94, 106, 210, 0.1)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' },
    featureTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' },
    featureDesc: { fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 },
    highlights: { padding: '5rem 1rem', maxWidth: '64rem', margin: '0 auto' },
    highlightsGrid: { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: '0.75rem' },
    highlightTag: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', borderRadius: '9999px', fontSize: '0.875rem', color: '#4b5563' },
    cta: { padding: '5rem 1rem', maxWidth: '48rem', margin: '0 auto' },
    ctaBox: { textAlign: 'center' as const, padding: '3rem', background: 'linear-gradient(135deg, #5E6AD2 0%, #764ba2 100%)', borderRadius: '1rem', color: 'white' },
    ctaHeading: { fontSize: '1.875rem', fontWeight: 700, marginBottom: '1rem' },
    ctaText: { fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem' },
    ctaButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', color: '#5E6AD2', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none' },
    ctaButton2: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255, 255, 255, 0.3)' },
    footer: { padding: '3rem 1rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' },
    footerInner: { maxWidth: '72rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' },
    footerBottom: { maxWidth: '72rem', margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#9ca3af' },
  };

  return (
    <div style={styles.page}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Layers style={{ width: '1rem', height: '1rem', color: 'white' }} />
            </div>
            <span style={styles.logoText}>Flowpig</span>
          </div>
          <div style={styles.navLinks}>
            <Link to="/login" style={styles.navLink}>Sign In</Link>
            <Link to="/signup" style={styles.navButton}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={styles.hero}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={styles.badge}>
            <Sparkles style={{ width: '1rem', height: '1rem' }} />
            <span>Now with AI-powered features</span>
          </div>
          
          <h1 style={styles.heading}>
            The workspace for
            <br />
            <span style={styles.accent}>modern teams</span>
          </h1>
          
          <p style={styles.subheading}>
            Notion-style docs meet Linear-style issue tracking.
            Write, plan, and ship products — all in one place.
          </p>
          
          <div style={styles.buttonGroup}>
            <Link to="/signup" style={styles.primaryButton}>
              Get Started Free
              <ArrowRight style={{ width: '1rem', height: '1rem' }} />
            </Link>
            <Link to="/acme-corp" style={styles.secondaryButton}>
              <Play style={{ width: '1rem', height: '1rem' }} />
              View Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" style={styles.features}>
        <div style={styles.sectionTitle}>
          <h2 style={styles.sectionHeading}>Everything you need to ship faster</h2>
          <p style={styles.sectionSubheading}>Combine the best of Notion and Linear into a single, seamless experience.</p>
        </div>

        <div style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              style={styles.featureCard}
              whileHover={{ boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
            >
              <div style={styles.featureIcon}>
                <feature.icon style={{ width: '1.25rem', height: '1.25rem', color: '#5E6AD2' }} />
              </div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section style={styles.highlights}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={styles.sectionHeading}>Loved by productive teams</h2>
        </div>
        <div style={styles.highlightsGrid}>
          {highlights.map((highlight, index) => (
            <div key={index} style={styles.highlightTag}>
              <CheckCircle2 style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={styles.ctaBox}>
          <h2 style={styles.ctaHeading}>Ready to streamline your workflow?</h2>
          <p style={styles.ctaText}>Join thousands of teams who write, plan, and ship faster with Flowpig.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={styles.ctaButton}>
              Get Started Free
              <ArrowRight style={{ width: '1rem', height: '1rem' }} />
            </Link>
            <Link to="/acme-corp" style={styles.ctaButton2}>
              <Play style={{ width: '1rem', height: '1rem' }} />
              View Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <Layers style={{ width: '1rem', height: '1rem', color: 'white' }} />
              </div>
              <span style={{ fontWeight: 600, color: '#111827' }}>Flowpig</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>The workspace for modern teams.</p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Product</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.875rem', color: '#6b7280', lineHeight: 2 }}>
              <li><a href="#features" style={{ color: '#6b7280', textDecoration: 'none' }}>Features</a></li>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Pricing</a></li>
              <li><Link to="/acme-corp" style={{ color: '#6b7280', textDecoration: 'none' }}>Demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Resources</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.875rem', color: '#6b7280', lineHeight: 2 }}>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Documentation</a></li>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>API</a></li>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Community</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Company</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.875rem', color: '#6b7280', lineHeight: 2 }}>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>About</a></li>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Blog</a></li>
              <li><a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Careers</a></li>
            </ul>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>© 2025 Flowpig. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

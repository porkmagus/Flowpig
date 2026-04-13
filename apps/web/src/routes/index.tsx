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
    page: { minHeight: '100vh', backgroundColor: '#0D0D0D', fontFamily: 'Inter, system-ui, sans-serif' },
    nav: { 
      position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50,
      backgroundColor: 'rgba(13,13,13,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #2A2A2A'
    },
    navInner: { maxWidth: '72rem', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' },
    logo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    logoIcon: { width: '2rem', height: '2rem', backgroundColor: 'rgba(94,106,210,0.15)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(94,106,210,0.25)' },
    logoText: { fontSize: '1.25rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
    navLink: { fontSize: '0.875rem', color: '#A0A0A0', textDecoration: 'none', transition: 'color 0.15s ease' },
    navButton: { fontSize: '0.875rem', backgroundColor: '#5E6AD2', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontWeight: 500, textDecoration: 'none', transition: 'background-color 0.15s ease' },
    hero: { paddingTop: '10rem', paddingBottom: '6rem', paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center' as const },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(94,106,210,0.1)', border: '1px solid rgba(94,106,210,0.25)', borderRadius: '9999px', fontSize: '0.875rem', color: '#5E6AD2', marginBottom: '1.5rem' },
    heading: { fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 600, color: '#FFFFFF', marginBottom: '1.5rem', lineHeight: 1.1, letterSpacing: '-0.02em' },
    accent: { color: '#5E6AD2' },
    subheading: { fontSize: '1.25rem', color: '#A0A0A0', maxWidth: '42rem', margin: '0 auto 2.5rem', lineHeight: 1.7 },
    buttonGroup: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const },
    primaryButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#5E6AD2', color: 'white', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: 500, textDecoration: 'none', fontSize: '1rem', transition: 'background-color 0.15s ease' },
    secondaryButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', color: '#E0E0E0', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: 500, textDecoration: 'none', border: '1px solid #2A2A2A', transition: 'border-color 0.15s ease, color 0.15s ease' },
    features: { padding: '6rem 1rem', backgroundColor: '#0D0D0D' },
    sectionTitle: { textAlign: 'center' as const, marginBottom: '3.5rem' },
    sectionHeading: { fontSize: '2.25rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem', letterSpacing: '-0.02em' },
    sectionSubheading: { fontSize: '1.125rem', color: '#A0A0A0', maxWidth: '42rem', margin: '0 auto', lineHeight: 1.6 },
    featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem', maxWidth: '72rem', margin: '0 auto' },
    featureCard: { backgroundColor: '#1A1A1A', borderRadius: '1rem', padding: '1.75rem', border: '1px solid #2A2A2A', transition: 'border-color 0.2s, transform 0.2s' },
    featureIcon: { width: '2.75rem', height: '2.75rem', backgroundColor: 'rgba(94,106,210,0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid rgba(94,106,210,0.15)' },
    featureTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.5rem' },
    featureDesc: { fontSize: '0.9375rem', color: '#A0A0A0', lineHeight: 1.6 },
    highlights: { padding: '6rem 1rem', maxWidth: '64rem', margin: '0 auto' },
    highlightsGrid: { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: '0.75rem' },
    highlightTag: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#1A1A1A', borderRadius: '9999px', fontSize: '0.875rem', color: '#A0A0A0', border: '1px solid #2A2A2A' },
    cta: { padding: '6rem 1rem', maxWidth: '48rem', margin: '0 auto' },
    ctaBox: { textAlign: 'center' as const, padding: '3.5rem', background: 'linear-gradient(135deg, #5E6AD2 0%, #4A55B8 100%)', borderRadius: '1.25rem', color: 'white', border: '1px solid rgba(94,106,210,0.3)' },
    ctaHeading: { fontSize: '2rem', fontWeight: 600, marginBottom: '1rem', letterSpacing: '-0.02em' },
    ctaText: { fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '2rem', lineHeight: 1.6 },
    ctaButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', color: '#5E6AD2', padding: '0.875rem 1.75rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', transition: 'transform 0.15s ease' },
    ctaButton2: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'white', padding: '0.875rem 1.75rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255, 255, 255, 0.25)', transition: 'background-color 0.15s ease' },
    footer: { padding: '4rem 1rem', borderTop: '1px solid #2A2A2A', backgroundColor: '#0D0D0D' },
    footerInner: { maxWidth: '72rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem' },
    footerLogo: { fontWeight: 600, color: '#FFFFFF' },
    footerText: { fontSize: '0.875rem', color: '#6E6E6E', marginTop: '0.5rem' },
    footerHeading: { fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#E0E0E0' },
    footerList: { listStyle: 'none', fontSize: '0.875rem', color: '#A0A0A0', lineHeight: 2 },
    footerLink: { color: '#A0A0A0', textDecoration: 'none', transition: 'color 0.15s ease' },
    footerBottom: { maxWidth: '72rem', margin: '2.5rem auto 0', paddingTop: '2rem', borderTop: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6E6E6E' },
  };

  return (
    <div style={styles.page}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Layers style={{ width: '1.25rem', height: '1.25rem', color: '#5E6AD2' }} />
            </div>
            <span style={styles.logoText}>Flowpig</span>
          </div>
          <div style={styles.navLinks}>
            <Link 
              to="/login" 
              style={styles.navLink}
              onMouseEnter={(e) => e.currentTarget.style.color = '#E0E0E0'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              style={styles.navButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#545EC4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5E6AD2'}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={styles.hero}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={styles.badge}>
            <Sparkles style={{ width: '0.875rem', height: '0.875rem' }} />
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
            <Link 
              to="/signup" 
              style={styles.primaryButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#545EC4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5E6AD2'}
            >
              Get Started Free
              <ArrowRight style={{ width: '1rem', height: '1rem' }} />
            </Link>
            <Link 
              to="/acme-corp" 
              style={styles.secondaryButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#5E6AD2';
                e.currentTarget.style.color = '#5E6AD2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2A2A2A';
                e.currentTarget.style.color = '#E0E0E0';
              }}
            >
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
              whileHover={{ 
                borderColor: '#3A3A3A',
                transform: 'translateY(-2px)'
              }}
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
            <motion.div 
              key={index} 
              style={styles.highlightTag}
              whileHover={{ borderColor: '#5E6AD2', color: '#5E6AD2' }}
            >
              <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem', color: '#0D9B6A' }} />
              <span>{highlight}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5 }} 
          style={styles.ctaBox}
        >
          <h2 style={styles.ctaHeading}>Ready to streamline your workflow?</h2>
          <p style={styles.ctaText}>Join thousands of teams who write, plan, and ship faster with Flowpig.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              to="/signup" 
              style={styles.ctaButton}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Get Started Free
              <ArrowRight style={{ width: '1rem', height: '1rem' }} />
            </Link>
            <Link 
              to="/acme-corp" 
              style={styles.ctaButton2}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            >
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
                <Layers style={{ width: '1.25rem', height: '1.25rem', color: '#5E6AD2' }} />
              </div>
              <span style={styles.footerLogo}>Flowpig</span>
            </div>
            <p style={styles.footerText}>The workspace for modern teams.</p>
          </div>
          <div>
            <h4 style={styles.footerHeading}>Product</h4>
            <ul style={styles.footerList}>
              <li><a href="#features" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Features</a></li>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Pricing</a></li>
              <li><Link to="/acme-corp" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={styles.footerHeading}>Resources</h4>
            <ul style={styles.footerList}>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Documentation</a></li>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>API</a></li>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Community</a></li>
            </ul>
          </div>
          <div>
            <h4 style={styles.footerHeading}>Company</h4>
            <ul style={styles.footerList}>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>About</a></li>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Blog</a></li>
              <li><a href="#" style={styles.footerLink} onMouseEnter={(e) => e.currentTarget.style.color = '#5E6AD2'} onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}>Careers</a></li>
            </ul>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>© 2025 Flowpig. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ ...styles.footerLink, color: '#6E6E6E' }} onMouseEnter={(e) => e.currentTarget.style.color = '#A0A0A0'} onMouseLeave={(e) => e.currentTarget.style.color = '#6E6E6E'}>Privacy</a>
            <a href="#" style={{ ...styles.footerLink, color: '#6E6E6E' }} onMouseEnter={(e) => e.currentTarget.style.color = '#A0A0A0'} onMouseLeave={(e) => e.currentTarget.style.color = '#6E6E6E'}>Terms</a>
            <a href="#" style={{ ...styles.footerLink, color: '#6E6E6E' }} onMouseEnter={(e) => e.currentTarget.style.color = '#A0A0A0'} onMouseLeave={(e) => e.currentTarget.style.color = '#6E6E6E'}>Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

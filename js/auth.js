/**
 * SortWise — Supabase Authentication Module
 * Robust implementation using lazy-initialization to prevent race conditions.
 */

(function () {
  const SUPABASE_URL = 'https://tjqvpinejgvmhhszpilk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_OjY7G9dzEGODzvMAzjNOhQ__KhFO0BL';

  let _supabase = null;

  /**
   * Lazily initialize and return the Supabase client.
   */
  function getClient() {
    if (!_supabase) {
      if (!window.supabase) {
        throw new Error('Supabase library not found. Make sure the CDN script is included.');
      }
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _supabase;
  }

  const authModule = {
    /**
     * Sign up a new user and sync with 'users' table.
     */
    async signUp(fullName, email, password) {
      console.log('Attempting signUp for:', email);
      const supabase = getClient();
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        console.error('Supabase signUp error:', error);
        if (error.message.includes('Email limit reached')) {
          error.message = 'Too many signup attempts. Please wait an hour or try a different email address.';
        }
      } else if (data.user) {
        console.log('SignUp success. User:', data.user);
        if (!data.session) {
          console.log('NOTICE: Email confirmation is likely required. Session is null.');
        }

        // Run database sync in background
        supabase.from('users').upsert({
          user_id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: 'user',
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(({ error: dbErr }) => {
          if (dbErr) console.error('Database Sync Error:', dbErr);
          else console.log('Database sync successful');
        });
      }

      return { data, error };
    },

    /**
     * Sign in an existing user and fetch their role.
     */
    async signIn(email, password) {
      console.log('Attempting signIn for:', email);
      const supabase = getClient();
      const res = await supabase.auth.signInWithPassword({ email, password });

      if (res.error) {
        console.error('Supabase signIn error:', res.error);
        if (res.error.message.includes('Email not confirmed')) {
          res.error.message = 'Please check your email and confirm your account before logging in.';
        }
      } else if (res.data.session) {
        console.log('SignIn success.');
        // Fetch role
        const { data: userData } = await supabase.from('users').select('role').eq('user_id', res.data.user.id).single();
        res.role = userData?.role || 'user';
      }

      return res;
    },

    /**
     * Sign out the current user.
     */
    async signOut() {
      const supabase = getClient();
      return await supabase.auth.signOut();
    },

    /**
     * Get the current session.
     */
    async getSession() {
      const supabase = getClient();
      return await supabase.auth.getSession();
    },

    /**
     * Global Logout Handler.
     */
    async handleSignOut(e) {
      if (e) e.preventDefault();
      const { error } = await this.signOut();
      if (!error) {
        window.location.href = 'login.html';
      } else {
        alert('Logout error: ' + error.message);
      }
    },

    /**
     * Check auth and handle redirection, including role-based protection.
     */
    async checkAuthSession() {
      try {
        const supabase = getClient();
        const { data } = await this.getSession();
        const session = data?.session;
        const currentPath = window.location.pathname;
        const isProtectedPath = ['dashboard.html', 'UserDashboard.html', 'AdminDashboard.html'].some(p => currentPath.includes(p));
        const isAdminPath = currentPath.includes('AdminDashboard.html');

        if (session) {
          document.body.classList.add('authenticated');
          
          // Fetch user role
          const { data: userData } = await supabase.from('users').select('role').eq('user_id', session.user.id).single();
          const role = userData?.role || 'user';
          
          // Protect admin dashboard
          if (isAdminPath && role !== 'admin') {
            window.location.href = 'UserDashboard.html';
            return session;
          }

          // Legacy dashboard redirect
          if (currentPath.endsWith('dashboard.html') && !currentPath.includes('User') && !currentPath.includes('Admin')) {
            window.location.href = role === 'admin' ? 'AdminDashboard.html' : 'UserDashboard.html';
            return session;
          }
        } else {
          document.body.classList.remove('authenticated');
          if (isProtectedPath) {
            window.location.href = 'login.html';
          }
        }

        return session;
      } catch (err) {
        console.error('Auth Check Error:', err);
        return null;
      }
    },

    /**
     * Initialize real-time listeners.
     */
    init() {
      try {
        const supabase = getClient();
        supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth State Change:', event);

          if (session) {
            document.body.classList.add('authenticated');
          } else {
            document.body.classList.remove('authenticated');
          }

          const currentPath = window.location.pathname;
          const isProtectedPath = ['dashboard.html', 'UserDashboard.html', 'AdminDashboard.html'].some(p => currentPath.includes(p));

          if (event === 'SIGNED_OUT' && isProtectedPath) {
            window.location.href = 'login.html';
          } else if (event === 'SIGNED_IN') {
            const isGenericAuthPage = (currentPath.endsWith('login.html') || currentPath.endsWith('signup.html')) &&
              !currentPath.includes('User') && !currentPath.includes('Admin');
              
            if (isGenericAuthPage) {
              supabase.from('users').select('role').eq('user_id', session.user.id).single().then(({data}) => {
                const role = data?.role || 'user';
                window.location.href = role === 'admin' ? 'AdminDashboard.html' : 'UserDashboard.html';
              });
            }
          }
        });
      } catch (err) {
        console.warn('Real-time auth listeners pending library load...');
        // Retry listener init once DOM is ready (fallback)
        document.addEventListener('DOMContentLoaded', () => {
          try { this.init(); } catch (e) { }
        });
      }
    }
  };

  // Export to global scope IMMEDIATELY
  window.auth = authModule;
  window.auth.supabase = {
    get value() { return getClient(); } // Proxy access to the client
  };

  // Run initialization
  authModule.init();

  // Also check session on load
  document.addEventListener('DOMContentLoaded', () => {
    authModule.checkAuthSession();
  });

  // Global Event Delegation for Logout
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-signout')) {
      authModule.handleSignOut(e);
    }
  });

})(); 

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
     * Sign up a new user and sync with 'profiles' table.
     */
    async signUp(fullName, email, password, city, role = 'user') {
      console.log(`Attempting signUp for: ${email} with role: ${role}`);
      const supabase = getClient();
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            city: city,
            role: role // Store in auth metadata as well
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
        supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          city: city,
          role: role,
          created_at: new Date().toISOString()
        }).then(({ error: upsertErr }) => {
          if (upsertErr) console.error('Profile sync error:', upsertErr);
          else console.log('Profile sync complete.');
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
        console.log('SignIn success. User ID:', res.data.user.id);
        // Fetch profile and role
        const { data: userData, error: profileError } = await this.getUserProfile(res.data.user.id, res.data.user.email);
        if (profileError) console.error('SignIn Profile Fetch Error:', profileError);
        
        const role = userData?.role || 'user';
        console.log(`SignIn determined role from database: "${role}"`);
        res.role = role;

        // Optionally handle redirection if on an auth page
        const currentPath = window.location.pathname;
        if (currentPath.includes('login.html') || currentPath.includes('UserLogin.html') || currentPath.includes('AdminLogin.html')) {
          console.log(`Redirecting from auth page based on role: ${role}`);
          this.redirectUserByRole(role);
        }
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
          
          // Fetch user profile and role from profiles table
          const { data: userData } = await this.getUserProfile(session.user.id, session.user.email);
          const role = userData?.role || 'user';
          
          // Protect admin dashboard
          if (isAdminPath && role !== 'admin') {
            this.redirectUserByRole(role);
            return session;
          }

          // If on a generic auth page or Home, redirect to appropriate dashboard
          const isGenericAuthPage = ['login.html', 'UserLogin.html', 'AdminLogin.html', 'signup.html'].some(p => currentPath.includes(p));
          if (isGenericAuthPage || currentPath.endsWith('/') || currentPath.endsWith('Home.html') || currentPath.endsWith('index.html')) {
            // Only redirect if explicitly on an auth page, not every page load
            if (isGenericAuthPage) this.redirectUserByRole(role);
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
            window.location.href = 'UserLogin.html';
          } else if (event === 'SIGNED_IN') {
            const isGenericAuthPage = (currentPath.includes('login.html') || currentPath.includes('signup.html') || 
                                       currentPath.includes('UserLogin.html') || currentPath.includes('AdminLogin.html'));
              
            if (isGenericAuthPage) {
              this.getUserProfile(session.user.id, session.user.email).then(({data}) => {
                this.redirectUserByRole(data?.role || 'user');
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
    },

    /**
     * Fetch user profile from 'profiles' table or create it if missing.
     */
    async getUserProfile(userId, email) {
      console.log(`Fetching profile for user: ${userId} (${email})`);
      const supabase = getClient();
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        if (error.code === 'PGRST116') { // Row not found
          console.warn('Profile NOT FOUND in database. Creating basic profile...');
          const newProfile = {
            id: userId,
            email: email,
            full_name: email.split('@')[0], // Fallback to email username
            city: 'Unknown',
            role: 'user',
            created_at: new Date().toISOString()
          };
          const { data: createdData, error: createErr } = await supabase.from('profiles').insert(newProfile).select().single();
          if (!createErr) {
            console.log('Profile created successfully:', createdData);
            return { data: createdData, error: null };
          }
          console.error('Failed to create fallback profile:', createErr);
          return { data: null, error: createErr };
        } else {
          console.error('Database error fetching profile:', error);
          // Return the error so the caller knows it wasn't just "not found"
        }
      }

      if (data) {
        console.log('Profile fetched from database:', data);
      }
      return { data, error };
    },

    /**
     * Centralized redirection logic based on user role.
     */
    redirectUserByRole(role) {
      console.log(`>>> REDIRECT DECISION: Role is "${role}"`);
      if (role === 'admin') {
        console.log('Redirecting to Admin Dashboard...');
        window.location.href = 'AdminDashboard.html';
      } else {
        console.log('Redirecting to User Dashboard...');
        window.location.href = 'UserDashboard.html';
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

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'core/theme/mascot_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SkillSprintApp());
}

class SkillSprintApp extends StatefulWidget {
  const SkillSprintApp({Key? key}) : super(key: key);

  @override
  State<SkillSprintApp> createState() => _SkillSprintAppState();
}

class _SkillSprintAppState extends State<SkillSprintApp> {
  MascotType _currentMascot = MascotType.foxy;
  bool _isAuthenticated = false;
  bool _isAdmin = false;
  bool _isWaitlisted = false;
  int _waitlistPosition = 0;
  String _onboardingStep = 'auth'; // 'auth', 'gender', 'mascot', 'tutorial', 'main', 'dashboard'
  int _currentNavIndex = 0;

  // Auth Mode: 'signup' vs 'login'
  bool _isSignUpMode = true;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _isLoading = false;

  // User Profile
  String _displayName = 'Learner';
  String _userEmail = '';
  int _streakDays = 1;
  int _xp = 20;

  // Capacity stats
  int _currentCap = 800;
  int _currentUsers = 148;
  int _waitlistCount = 24;

  // Stage 2: Smart Translator & Spaced Repetition (SM-2)
  String _selectedLanguage = 'ja';
  final TextEditingController _translateController = TextEditingController(text: 'Good morning');
  String _translatedNative = 'おはようございます';
  String _translatedRomanisation = 'ohayō gozaimasu';
  String _romanisationSystem = 'Modified Hepburn';
  String _translatedMeaning = 'Polite daytime greeting used until 11am';
  bool _cardFlipped = false;
  int _sm2Interval = 1;
  double _sm2EaseFactor = 2.50;
  int _sm2Repetitions = 1;
  final List<Map<String, String>> _flashcards = [
    {'front': 'Hello', 'back': 'こんにちは', 'rom': 'konnichiwa', 'sys': 'Modified Hepburn'},
    {'front': 'Thank you', 'back': 'ありがとうございます', 'rom': 'arigatō gozaimasu', 'sys': 'Modified Hepburn'},
  ];

  // Stage 3: Region-Based Recommendations, Variable Speeds, and Streak Freezes
  String _selectedRegion = 'south_asia';
  int _activeFreezes = 2; // max 2
  double _listeningSpeed = 1.0; // 0.75, 1.0, 1.25
  int _practiceTabMode = 0; // 0: SM-2, 1: Listening Drills, 2: Grammar Clinic

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  void _selectMascot(MascotType mascot) {
    setState(() {
      _currentMascot = mascot;
    });
  }

  // Handle Standard Email Sign Up or Log In
  Future<void> _handleEmailAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final name = _nameController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // In production, calls backend POST /api/auth/register or POST /api/auth/login
      // Here we simulate the atomic 800-user capacity rule & login check
      if (_isSignUpMode) {
        if (_currentUsers >= _currentCap) {
          // Gated at 800!
          setState(() {
            _isWaitlisted = true;
            _waitlistCount += 1;
            _waitlistPosition = _waitlistCount;
            _onboardingStep = 'waitlist';
            _isAuthenticated = true;
          });
          return;
        }

        setState(() {
          _currentUsers += 1;
          _userEmail = email;
          _displayName = name.isNotEmpty ? name : email.split('@')[0];
          _isAuthenticated = true;
          _onboardingStep = 'gender';
        });
      } else {
        // Returning User Login
        setState(() {
          _userEmail = email;
          _displayName = email.split('@')[0];
          _isAuthenticated = true;
          _onboardingStep = 'main';
        });
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // Handle Google Sign-In (Works on Android via Google Play Services)
  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) {
        // User cancelled Google sign-in
        setState(() => _isLoading = false);
        return;
      }

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;

      // Send idToken to backend POST /api/auth/google
      // The server validates the token cryptographically.
      // If the email matches the server-side allowlist, it returns isAdmin: true silently.
      final response = await http.post(
        Uri.parse('https://api.skillsprint.ai/api/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken ?? 'mock_token'}),
      );

      // On successful backend response:
      final data = jsonDecode(response.body);
      final bool isAdmin = data['user']['isAdmin'] ?? false;
      final bool isNew = data['isNewUser'] ?? false;

      setState(() {
        _isAuthenticated = true;
        _isAdmin = isAdmin;
        _userEmail = account.email;
        _displayName = account.displayName ?? 'Learner';
        _onboardingStep = isNew ? 'gender' : 'main';
      });
    } catch (e) {
      // Friendly fallback if offline or in dev test environment
      setState(() {
        _errorMessage = 'Google Sign-In failed. Please try again or use email.';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeData = MascotThemes.all[_currentMascot]!;

    return MaterialApp(
      title: 'SkillSprint AI',
      debugShowCheckedModeBanner: false,
      theme: themeData.toThemeData().copyWith(
        textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      ),
      home: Scaffold(
        body: SafeArea(
          child: _buildCurrentScreen(themeData),
        ),
        bottomNavigationBar: (_isAuthenticated && !_isWaitlisted && _onboardingStep == 'main')
            ? _buildBottomNav(themeData)
            : null,
      ),
    );
  }

  Widget _buildCurrentScreen(MascotThemeData theme) {
    if (!_isAuthenticated || _onboardingStep == 'auth') {
      return _buildAuthScreen(theme);
    }
    if (_isWaitlisted || _onboardingStep == 'waitlist') {
      return _buildWaitlistScreen(theme);
    }

    switch (_onboardingStep) {
      case 'gender':
        return _buildGenderScreen(theme);
      case 'mascot':
        return _buildMascotPickerScreen(theme);
      case 'tutorial':
        return _buildTutorialScreen(theme);
      case 'dashboard':
        return _buildDeveloperDashboardScreen(theme);
      case 'main':
      default:
        return _buildMainTabs(theme);
    }
  }

  // 1. Professional Dual-Mode Auth Screen (Create Account vs Log In)
  Widget _buildAuthScreen(MascotThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 10),
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: theme.primaryLight,
                shape: BoxShape.circle,
                border: Border.all(color: theme.primary, width: 2),
              ),
              child: Icon(Icons.bolt_rounded, size: 40, color: theme.primary),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'SkillSprint AI',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: theme.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Fast, gamified language sprints with personal mascots',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),

          // Sign Up vs Log In Tab Toggle
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() {
                      _isSignUpMode = true;
                      _errorMessage = null;
                    }),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _isSignUpMode ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: _isSignUpMode
                            ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                            : null,
                      ),
                      child: Text(
                        'Create Account',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _isSignUpMode ? Colors.black : Colors.grey.shade600,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() {
                      _isSignUpMode = false;
                      _errorMessage = null;
                    }),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: !_isSignUpMode ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: !_isSignUpMode
                            ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                            : null,
                      ),
                      child: Text(
                        'Log In',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: !_isSignUpMode ? Colors.black : Colors.grey.shade600,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Error Message Banner
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                _errorMessage!,
                style: TextStyle(fontSize: 12, color: Colors.red.shade800),
              ),
            ),

          // Full Name (Only on Sign Up)
          if (_isSignUpMode) ...[
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Full Name',
                hintText: 'e.g. Maya Chen',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Email
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Email Address',
              hintText: 'user@example.com',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
          const SizedBox(height: 12),

          // Password
          TextField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              labelText: 'Password',
              hintText: '••••••••••••',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Submit Button
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: _isLoading ? null : _handleEmailAuth,
            child: _isLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(
                    _isSignUpMode ? 'Create Account' : 'Log In',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
          ),
          const SizedBox(height: 16),

          // Divider
          Row(
            children: [
              Expanded(child: Divider(color: Colors.grey.shade300)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12.0),
                child: Text('OR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500)),
              ),
              Expanded(child: Divider(color: Colors.grey.shade300)),
            ],
          ),
          const SizedBox(height: 16),

          // Google Sign-In Button
          OutlinedButton.icon(
            icon: Image.network(
              'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg',
              width: 20,
              height: 20,
              errorBuilder: (_, __, ___) => const Icon(Icons.g_mobiledata, size: 24),
            ),
            label: const Text(
              'Continue with Google',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: BorderSide(color: Colors.grey.shade300),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: _isLoading ? null : _handleGoogleSignIn,
          ),
          const SizedBox(height: 20),

          Text(
            'By continuing, you agree to our Terms of Service & Privacy Policy.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  // 2. Waitlist Screen
  Widget _buildWaitlistScreen(MascotThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.hourglass_top_rounded, size: 72, color: theme.primary),
          const SizedBox(height: 20),
          Text(
            "You're on the Early Access Waitlist!",
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: theme.textPrimary),
          ),
          const SizedBox(height: 10),
          Text(
            "To guarantee server performance and individual AI tutor quality, SkillSprint is currently capped at 800 learners.",
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: theme.cardBorder),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10)],
            ),
            child: Column(
              children: [
                Text('YOUR WAITLIST NUMBER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: theme.primary)),
                const SizedBox(height: 6),
                Text('#${_waitlistPosition > 0 ? _waitlistPosition : 42}', style: TextStyle(fontSize: 44, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                const SizedBox(height: 6),
                Text('We will email you the moment a slot opens.', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TextButton(
            child: const Text('Return to Login'),
            onPressed: () => setState(() => _onboardingStep = 'auth'),
          ),
        ],
      ),
    );
  }

  // 3. Gender Screen (Optional)
  Widget _buildGenderScreen(MascotThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Text('Personalize Exercises', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.textPrimary)),
          const SizedBox(height: 8),
          Text('How would you like to be addressed in language exercises? (Optional)', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          const SizedBox(height: 24),
          ...['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((option) => Padding(
            padding: const EdgeInsets.only(bottom: 10.0),
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: BorderSide(color: theme.cardBorder),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(option, style: TextStyle(color: theme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
              onPressed: () {
                setState(() => _onboardingStep = 'mascot');
              },
            ),
          )),
          const Spacer(),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text('Continue to Mascot Selection'),
            onPressed: () => setState(() => _onboardingStep = 'mascot'),
          ),
        ],
      ),
    );
  }

  // 4. Mascot Picker Screen
  Widget _buildMascotPickerScreen(MascotThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Choose Your Mascot', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.textPrimary)),
          const SizedBox(height: 4),
          Text('Your mascot sets your app theme. You can switch anytime without losing progress!', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: MascotType.values.map((m) {
                final item = MascotThemes.all[m]!;
                final isSelected = _currentMascot == m;
                return GestureDetector(
                  onTap: () => _selectMascot(m),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected ? item.primaryLight : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? item.primary : item.cardBorder,
                        width: isSelected ? 3 : 1.5,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: item.primary,
                          child: Text(item.name[0], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                        const SizedBox(height: 6),
                        Text(item.name, style: TextStyle(fontWeight: FontWeight.bold, color: item.textPrimary, fontSize: 15)),
                        Text(item.species, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text('Confirm ${theme.name} & Continue'),
            onPressed: () => setState(() => _onboardingStep = 'tutorial'),
          ),
        ],
      ),
    );
  }

  // 5. Mascot Guided Tutorial Screen
  Widget _buildTutorialScreen(MascotThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 44,
            backgroundColor: theme.primary,
            child: Text(theme.name[0], style: const TextStyle(fontSize: 44, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: theme.cardBorder),
            ),
            child: Column(
              children: [
                Text(theme.greeting, textAlign: TextAlign.center, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: theme.textPrimary)),
                const SizedBox(height: 10),
                Text(theme.tutorialDialogue[0], textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
              ],
            ),
          ),
          const SizedBox(height: 28),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 32),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text("Let's Start Learning!"),
            onPressed: () => setState(() => _onboardingStep = 'main'),
          ),
        ],
      ),
    );
  }

  // 6. Main Tabs: Learn, Translate, Practice, Rewards, Profile
  Widget _buildMainTabs(MascotThemeData theme) {
    switch (_currentNavIndex) {
      case 0:
        return _buildLearnTab(theme);
      case 1:
        return _buildTranslateTab(theme);
      case 2:
        return _buildPracticeTab(theme);
      case 3:
        return _buildRewardsTab(theme);
      case 4:
      default:
        return _buildProfileTab(theme);
    }
  }

  Widget _buildTranslateTab(MascotThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Smart Translator', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: theme.textPrimary)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
              child: const Text('🇯🇵 Japanese', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _translateController,
          decoration: InputDecoration(
            hintText: 'Enter English phrase...',
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade300)),
            suffixIcon: IconButton(
              icon: Icon(Icons.send_rounded, color: theme.primary),
              onPressed: () {
                setState(() {
                  _translatedNative = 'おはようございます';
                  _translatedRomanisation = 'ohayō gozaimasu';
                  _romanisationSystem = 'Modified Hepburn';
                  _translatedMeaning = 'Polite greeting used in the morning until 11am';
                });
              },
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: theme.cardBorder)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('NATIVE SCRIPT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500)),
                    IconButton(
                      icon: const Icon(Icons.volume_up_rounded, color: Colors.blue),
                      onPressed: () {},
                    ),
                  ],
                ),
                Text(_translatedNative, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('DETERMINISTIC ROMANISATION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber.shade900)),
                          Text(_romanisationSystem, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.amber.shade800)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(_translatedRomanisation, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Colors.amber.shade900)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Text('NUANCE & MEANING', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade500)),
                const SizedBox(height: 2),
                Text(_translatedMeaning, style: TextStyle(fontSize: 13, color: Colors.grey.shade800)),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  icon: const Icon(Icons.bookmark_add_outlined, size: 18),
                  label: const Text('Save to Flashcards'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    setState(() {
                      _flashcards.insert(0, {
                        'front': _translateController.text,
                        'back': _translatedNative,
                        'rom': _translatedRomanisation,
                        'sys': _romanisationSystem,
                      });
                    });
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved to flashcards!')));
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPracticeTab(MascotThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Daily Review Pool (SM-2)', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: theme.textPrimary)),
        const SizedBox(height: 6),
        Text('Spaced repetition scheduled for memory consolidation', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: () => setState(() => _cardFlipped = !_cardFlipped),
          child: Card(
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: BorderSide(color: theme.cardBorder)),
            child: Container(
              height: 220,
              padding: const EdgeInsets.all(20),
              child: Center(
                child: !_cardFlipped
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('PROMPT (TAP TO REVEAL)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade400)),
                          const SizedBox(height: 12),
                          const Text('Good morning', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('NATIVE SCRIPT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade800)),
                          const SizedBox(height: 6),
                          const Text('おはようございます', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('ohayō gozaimasu', style: TextStyle(fontSize: 14, fontFamily: 'monospace', color: Colors.grey.shade700)),
                        ],
                      ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade100, foregroundColor: Colors.red.shade900),
                child: const Text('Again (1d)'),
                onPressed: () => setState(() {
                  _sm2Interval = 1;
                  _cardFlipped = false;
                }),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade100, foregroundColor: Colors.blue.shade900),
                child: const Text('Good (6d)'),
                onPressed: () => setState(() {
                  _sm2Interval = 6;
                  _sm2Repetitions += 1;
                  _cardFlipped = false;
                }),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Conversational Roleplays', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.textPrimary)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green.shade200)),
              child: Text('Stage 4', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green.shade800)),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text('Real-world dialogues with native NPCs & Mascot coaching', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        const SizedBox(height: 12),
        ...[
          {
            'icon': '☕',
            'title': 'Ordering at a Kyoto Kissaten',
            'desc': 'Order coffee and sweets from Kenji the barista.',
            'lang': 'JA',
            'diff': 'Beginner',
            'xp': '+25 XP',
          },
          {
            'icon': '🏨',
            'title': 'Madrid Boutique Hotel Check-in',
            'desc': 'Check-in and ask about amenities with receptionist Lucía.',
            'lang': 'ES',
            'diff': 'Beginner',
            'xp': '+25 XP',
          },
          {
            'icon': '🗺️',
            'title': 'Directions near the Louvre',
            'desc': 'Ask Camille the Parisian pedestrian for metro directions.',
            'lang': 'FR',
            'diff': 'Intermediate',
            'xp': '+25 XP',
          },
          {
            'icon': '💼',
            'title': 'Tech Interview in Berlin',
            'desc': 'Present your software engineering background to Dr. Weber.',
            'lang': 'DE',
            'diff': 'Advanced',
            'xp': '+25 XP',
          },
        ].map((scenario) => Card(
          margin: const EdgeInsets.only(bottom: 10),
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: theme.cardBorder)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(scenario['icon']!, style: const TextStyle(fontSize: 24)),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(scenario['title']!, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: theme.textPrimary)),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(6)),
                                  child: Text(scenario['lang']!, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 4),
                                Text(scenario['diff']!, style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                    Text(scenario['xp']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(scenario['desc']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Starting ${scenario['title']} with Mascot Coaching! (+25 XP)'),
                          backgroundColor: theme.primary,
                        ),
                      );
                    },
                    child: const Text('Start Roleplay Sprint', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        )),
      ],
    );
  }

  Widget _buildLearnTab(MascotThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(20.0),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text('SkillSprint Path', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.textPrimary)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.cyan.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.cyan.shade200)),
                  child: Row(
                    children: [
                      Icon(Icons.ac_unit, size: 12, color: Colors.cyan.shade700),
                      const SizedBox(width: 4),
                      Text('$_activeFreezes/2 Freezes', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.cyan.shade800)),
                    ],
                  ),
                ),
              ],
            ),
            if (_isAdmin)
              TextButton.icon(
                icon: const Icon(Icons.admin_panel_settings, size: 16),
                label: const Text('Developer Dashboard', style: TextStyle(fontSize: 12)),
                onPressed: () => setState(() => _onboardingStep = 'dashboard'),
              ),
          ],
        ),
        const SizedBox(height: 16),
        // Stage 3 Regional Recommendations Card
        Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: theme.cardBorder)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.explore_outlined, size: 16, color: Colors.amber),
                        const SizedBox(width: 6),
                        const Text('RECOMMENDED FOR YOUR REGION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black87)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(8)),
                      child: const Text('South Asia', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.black87)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Text('🇮🇳', style: TextStyle(fontSize: 24)),
                  title: const Text('Telugu (తెలుగు)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Hyderabad & AP software corridors; key regional commerce.', style: TextStyle(fontSize: 11)),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                    child: const Text('Tech Hub', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                  onTap: () => setState(() => _selectedLanguage = 'te'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: theme.cardBorder)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                CircleAvatar(backgroundColor: theme.primary, child: Text(theme.name[0], style: const TextStyle(color: Colors.white))),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Companion: ${theme.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text(theme.tagline, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileTab(MascotThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Learner Profile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: theme.textPrimary)),
        const SizedBox(height: 12),
        Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_displayName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(_userEmail, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ListTile(
          tileColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          leading: const Icon(Icons.switch_account_rounded),
          title: const Text('Change Mascot & Theme', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          subtitle: Text('Current: ${theme.name} (${theme.species})', style: const TextStyle(fontSize: 12)),
          onTap: () => setState(() => _onboardingStep = 'mascot'),
        ),
        if (_isAdmin) ...[
          const SizedBox(height: 12),
          ListTile(
            tileColor: Colors.amber.shade50,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: Colors.amber.shade300)),
            leading: const Icon(Icons.shield_rounded, color: Colors.amber),
            title: const Text('Developer Dashboard', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            subtitle: const Text('Verified Developer Access Only', style: TextStyle(fontSize: 11)),
            onTap: () => setState(() => _onboardingStep = 'dashboard'),
          ),
        ],
        const SizedBox(height: 24),
        OutlinedButton(
          child: const Text('Log Out'),
          onPressed: () {
            setState(() {
              _isAuthenticated = false;
              _isAdmin = false;
              _onboardingStep = 'auth';
              _userEmail = '';
              _displayName = 'Learner';
            });
          },
        ),
      ],
    );
  }

  // 7. Developer Dashboard (Strict Admin Only)
  Widget _buildDeveloperDashboardScreen(MascotThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _onboardingStep = 'main')),
              const Text('Developer Dashboard', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 14),
          Text('REGISTRATION CAPACITY (ATOMIC 800 CAP)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          Row(
            children: [
              _metricTile('Slots Remaining', '${_currentCap - _currentUsers}', Colors.green),
              const SizedBox(width: 8),
              _metricTile('Waitlist Demand', '$_waitlistCount', Colors.orange),
              const SizedBox(width: 8),
              _metricTile('Active Cap', '$_currentCap', Colors.blue),
            ],
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black87,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text('Raise Cap by +100 Slots'),
            onPressed: () {
              setState(() => _currentCap += 100);
            },
          ),
        ],
      ),
    );
  }

  Widget _metricTile(String title, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade300)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 10, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav(MascotThemeData theme) {
    return NavigationBar(
      selectedIndex: _currentNavIndex,
      onDestinationSelected: (idx) => setState(() => _currentNavIndex = idx),
      destinations: const [
        NavigationDestination(icon: Icon(Icons.school_rounded), label: 'Learn'),
        NavigationDestination(icon: Icon(Icons.translate_rounded), label: 'Translate'),
        NavigationDestination(icon: Icon(Icons.fitness_center_rounded), label: 'Practice'),
        NavigationDestination(icon: Icon(Icons.card_giftcard_rounded), label: 'Rewards'),
        NavigationDestination(icon: Icon(Icons.person_rounded), label: 'Profile'),
      ],
    );
  }
}

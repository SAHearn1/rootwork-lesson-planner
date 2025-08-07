import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Share2, Settings, Menu, X, 
  TreePine, Brain, Heart, Target, Calendar, TrendingUp,
  Star, Clock, CheckCircle, AlertCircle, User, Bell,
  BookOpen, Users, Award, Sparkles, Zap, Compass
} from 'lucide-react';

const RootWorkLessonPlanner = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [formData, setFormData] = useState({
    gradeLevel: '',
    subject: '',
    topic: '',
    duration: '90',
    studentContext: '',
    learningObjectives: '',
    traumaConsiderations: '',
    culturalAssets: '',
    urbanIntegration: '',
    assessmentType: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [usageData, setUsageData] = useState({
    tokensUsed: 0,
    tokensAvailable: 3,
    weeklyUsed: 0,
    weeklyLimit: 2,
    lastResetDate: null,
    deviceFingerprint: null,
    subscriptionLevel: 'free' // 'free', 'individual', 'premium'
  });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showRateLimit, setShowRateLimit] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  // Your backend API URL
  const API_BASE_URL = 'https://rootwork-lesson-planner-6v28.vercel.app';

  // Device fingerprinting for anti-sharing
  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvasFingerprint: canvas.toDataURL(),
      timestamp: Date.now()
    };
    
    const fingerprintString = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `fp_${Math.abs(hash)}_${Date.now()}`;
  };

  // Usage control system
  const checkUsageLimits = () => {
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (!usageData.lastResetDate || (now.getTime() - new Date(usageData.lastResetDate).getTime()) > oneWeek) {
      const newUsageData = {
        ...usageData,
        weeklyUsed: 0,
        lastResetDate: now.toISOString(),
        tokensAvailable: usageData.subscriptionLevel === 'free' ? 3 : 
                        usageData.subscriptionLevel === 'individual' ? 50 : 999
      };
      setUsageData(newUsageData);
      localStorage.setItem('rwUsageData', JSON.stringify(newUsageData));
      return newUsageData;
    }
    
    return usageData;
  };

  // Anti-sharing validation
  const validateDeviceAccess = (currentFingerprint) => {
    const storedData = localStorage.getItem('rwUsageData');
    if (!storedData) return true;
    
    try {
      const data = JSON.parse(storedData);
      if (data.deviceFingerprint && data.deviceFingerprint !== currentFingerprint) {
        const lastActivity = localStorage.getItem('rwLastActivity');
        const now = Date.now();
        
        if (lastActivity && (now - parseInt(lastActivity)) < 60000) {
          setRateLimitMessage('Account sharing detected. Each account is limited to one device. Please upgrade for multi-device access.');
          setShowRateLimit(true);
          return false;
        }
      }
      
      localStorage.setItem('rwLastActivity', now.toString());
      return true;
    } catch (error) {
      return true;
    }
  };

  // Token-based usage system
  const consumeToken = () => {
    const currentUsage = checkUsageLimits();
    
    const limits = {
      free: { tokensPerWeek: 3, plansPerWeek: 2 },
      individual: { tokensPerWeek: 50, plansPerWeek: 25 },
      premium: { tokensPerWeek: 999, plansPerWeek: 999 }
    };
    
    const userLimits = limits[currentUsage.subscriptionLevel];
    
    if (currentUsage.weeklyUsed >= userLimits.plansPerWeek) {
      setRateLimitMessage(`Weekly limit reached. ${currentUsage.subscriptionLevel === 'free' ? 'Upgrade for more lesson plans' : 'Limit resets next week'}.`);
      setShowRateLimit(true);
      return false;
    }
    
    if (currentUsage.tokensUsed >= currentUsage.tokensAvailable) {
      if (currentUsage.subscriptionLevel === 'free') {
        setShowUpgrade(true);
      } else {
        setRateLimitMessage('Token limit reached. Tokens refresh weekly.');
        setShowRateLimit(true);
      }
      return false;
    }
    
    const newUsageData = {
      ...currentUsage,
      tokensUsed: currentUsage.tokensUsed + 1,
      weeklyUsed: currentUsage.weeklyUsed + 1
    };
    
    setUsageData(newUsageData);
    localStorage.setItem('rwUsageData', JSON.stringify(newUsageData));
    return true;
  };

  // IP-based rate limiting
  const checkIPRateLimit = () => {
    const sessionKey = 'rwSessionUsage';
    const sessionData = sessionStorage.getItem(sessionKey);
    const now = Date.now();
    const hourLimit = 5;
    
    if (sessionData) {
      const data = JSON.parse(sessionData);
      const hourAgo = now - (60 * 60 * 1000);
      const recentUsage = data.usage.filter(timestamp => timestamp > hourAgo);
      
      if (recentUsage.length >= hourLimit) {
        setRateLimitMessage('Too many requests from this session. Please wait an hour before generating more lesson plans.');
        setShowRateLimit(true);
        return false;
      }
      
      recentUsage.push(now);
      sessionStorage.setItem(sessionKey, JSON.stringify({ usage: recentUsage }));
    } else {
      sessionStorage.setItem(sessionKey, JSON.stringify({ usage: [now] }));
    }
    
    return true;
  };

  // Analytics tracking
  const trackEvent = (eventName, eventData = {}) => {
    const analyticsData = {
      timestamp: new Date().toISOString(),
      event: eventName,
      sessionId: sessionStorage.getItem('sessionId') || 'anonymous',
      deviceFingerprint: usageData.deviceFingerprint,
      app: 'standalone_lesson_planner',
      subscriptionLevel: usageData.subscriptionLevel,
      tokensRemaining: usageData.tokensAvailable - usageData.tokensUsed,
      weeklyUsage: usageData.weeklyUsed,
      ...eventData
    };
    console.log('Analytics Event:', analyticsData);
    
    if (eventData.suspicious) {
      console.warn('Potential abuse detected:', analyticsData);
    }
  };

  // Reset usage data for testing
  const resetUsageData = () => {
    const resetData = {
      tokensUsed: 0,
      tokensAvailable: 3,
      weeklyUsed: 0,
      weeklyLimit: 2,
      lastResetDate: new Date().toISOString(),
      deviceFingerprint: generateDeviceFingerprint(),
      subscriptionLevel: 'free'
    };
    setUsageData(resetData);
    localStorage.setItem('rwUsageData', JSON.stringify(resetData));
    sessionStorage.clear();
    alert('Usage data reset for testing');
  };

  // Subscription upgrade
  const upgradeSubscription = (newLevel) => {
    const upgradeLimits = {
      individual: { tokensAvailable: 50, weeklyLimit: 25 },
      premium: { tokensAvailable: 999, weeklyLimit: 999 }
    };
    
    const limits = upgradeLimits[newLevel];
    const upgradeData = {
      ...usageData,
      subscriptionLevel: newLevel,
      tokensAvailable: limits.tokensAvailable,
      weeklyLimit: limits.weeklyLimit,
      tokensUsed: 0,
      weeklyUsed: 0
    };
    
    setUsageData(upgradeData);
    localStorage.setItem('rwUsageData', JSON.stringify(upgradeData));
    
    trackEvent('subscription_upgraded', { 
      newLevel,
      previousLevel: usageData.subscriptionLevel 
    });
  };

  useEffect(() => {
    const deviceFingerprint = generateDeviceFingerprint();
    
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    }
    
    const storedUsage = localStorage.getItem('rwUsageData');
    if (storedUsage) {
      try {
        const data = JSON.parse(storedUsage);
        const updatedData = { ...data, deviceFingerprint };
        setUsageData(updatedData);
        localStorage.setItem('rwUsageData', JSON.stringify(updatedData));
        
        if (!validateDeviceAccess(deviceFingerprint)) {
          trackEvent('device_validation_failed', { suspicious: true });
          return;
        }
      } catch (error) {
        console.error('Error loading usage data:', error);
      }
    } else {
      const initialData = {
        tokensUsed: 0,
        tokensAvailable: 3,
        weeklyUsed: 0,
        weeklyLimit: 2,
        lastResetDate: new Date().toISOString(),
        deviceFingerprint,
        subscriptionLevel: 'free'
      };
      setUsageData(initialData);
      localStorage.setItem('rwUsageData', JSON.stringify(initialData));
    }
    
    trackEvent('app_load');
  }, []);

  const templates = [
    {
      id: 'basic',
      title: 'Single Lesson Plan',
      description: 'Trauma-informed & culturally grounded single lesson',
      icon: FileText,
      color: 'from-green-600 to-green-700',
      duration: '45-90 minutes',
      bestFor: 'Daily classroom instruction'
    },
    {
      id: 'multiday',
      title: 'Multi-Day Unit',
      description: 'Community-integrated project-based learning',
      icon: Calendar,
      color: 'from-blue-600 to-indigo-700',
      duration: '3-5 days',
      bestFor: 'Deep dive projects'
    },
    {
      id: 'intensive',
      title: 'Trauma-Informed Intensive',
      description: 'High-support healing-centered instruction',
      icon: Heart,
      color: 'from-red-600 to-rose-700',
      duration: 'Flexible',
      bestFor: 'High-needs students'
    },
    {
      id: 'steam',
      title: 'Urban STEAM',
      description: 'Community problem-solving integration',
      icon: Target,
      color: 'from-purple-600 to-violet-700',
      duration: '90+ minutes',
      bestFor: 'STEAM integration'
    },
    {
      id: 'adaptation',
      title: 'Quick Enhancement',
      description: 'Transform existing lessons with Root Work principles',
      icon: TrendingUp,
      color: 'from-amber-600 to-orange-700',
      duration: 'Any length',
      bestFor: 'Existing curriculum'
    }
  ];

  const generateLessonPlan = async () => {
    if (!checkIPRateLimit()) return;
    if (!validateDeviceAccess(usageData.deviceFingerprint)) return;
    if (!consumeToken()) return;

    setIsGenerating(true);
    
    const rapidCount = parseInt(sessionStorage.getItem('rwRapidRequests') || '0') + 1;
    sessionStorage.setItem('rwRapidRequests', rapidCount.toString());
    
    setTimeout(() => {
      sessionStorage.setItem('rwRapidRequests', '0');
    }, 5 * 60 * 1000);
    
    let prompt = '';
    if (selectedTemplate === 'basic') {
      prompt = `Generate a comprehensive ${formData.duration}-minute trauma-informed lesson plan for ${formData.gradeLevel} ${formData.subject} on "${formData.topic}".

Student Context: ${formData.studentContext}
Learning Objectives: ${formData.learningObjectives}
Cultural Assets: ${formData.culturalAssets}
Trauma Considerations: ${formData.traumaConsiderations}
Urban Integration: ${formData.urbanIntegration}
Assessment Type: ${formData.assessmentType}`;
    } else if (selectedTemplate === 'multiday') {
      prompt = `Design a multi-day trauma-informed unit for ${formData.gradeLevel} ${formData.subject} focusing on "${formData.topic}".

Student Context: ${formData.studentContext}
Essential Learning: ${formData.learningObjectives}
Community Assets: ${formData.culturalAssets}
Living Learning Lab: ${formData.urbanIntegration}
Assessment Approach: ${formData.assessmentType}`;
    } else if (selectedTemplate === 'steam') {
      prompt = `Create a ${formData.duration}-minute Urban STEAM lesson for ${formData.gradeLevel} addressing "${formData.topic}".

STEAM Integration: ${formData.urbanIntegration}
Learning Goals: ${formData.learningObjectives}
Cultural Integration: ${formData.culturalAssets}
Trauma-Informed Design: ${formData.traumaConsiderations}
Assessment: ${formData.assessmentType}`;
    } else if (selectedTemplate === 'intensive') {
      prompt = `Develop an intensive trauma-informed lesson for ${formData.gradeLevel} ${formData.subject} on "${formData.topic}" prioritizing healing and safety.

Student Trauma Context: ${formData.studentContext} ${formData.traumaConsiderations}
Healing-Centered Goals: ${formData.learningObjectives}
Cultural Strengths: ${formData.culturalAssets}
Safe Environment Needs: ${formData.urbanIntegration}
Trauma-Sensitive Assessment: ${formData.assessmentType}`;
    } else if (selectedTemplate === 'adaptation') {
      prompt = `Transform an existing lesson to be trauma-informed and culturally responsive for ${formData.gradeLevel} ${formData.subject} on "${formData.topic}".

Current Student Needs: ${formData.studentContext}
Learning Goals: ${formData.learningObjectives}
Cultural Assets: ${formData.culturalAssets}
Trauma-Informed Adaptations: ${formData.traumaConsiderations}
Enhanced Assessment: ${formData.assessmentType}
Urban Context: ${formData.urbanIntegration}`;
    }

    const fullPrompt = `You are Dr. Shawn A. Hearn, creator of the Root Work Framework and "From Garden to Growth" methodology. You're an expert in trauma-informed pedagogy, cultural responsiveness, and the 5 R's methodology (ROOT, REGULATE, REFLECT, RESTORE, RECONNECT).

Create a comprehensive lesson plan using these specifications:

${prompt}

MANDATORY REQUIREMENTS:
- Include [Teacher Note:] and [Student Note:] for every major component
- Use Root Work Framework 5 R's methodology
- Ensure trauma-informed practices throughout
- Include cultural responsiveness strategies
- Provide MTSS scaffolding options
- Add regulation rituals and transitions
- Include assessment rubrics
- Ensure healing and learning are integrated

Format as a complete, implementable lesson plan with standards alignment, materials list, and extension activities.`;

    try {
      trackEvent('lesson_generation_started', {
        template: selectedTemplate,
        gradeLevel: formData.gradeLevel,
        subject: formData.subject,
        tokensRemaining: usageData.tokensAvailable - usageData.tokensUsed - 1,
        weeklyUsage: usageData.weeklyUsed + 1
      });

      // Call your backend API
      const response = await fetch(`${API_BASE_URL}/api/generate-lesson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          sessionId: sessionStorage.getItem('sessionId'),
          deviceFingerprint: usageData.deviceFingerprint,
          metadata: {
            template: selectedTemplate,
            gradeLevel: formData.gradeLevel,
            subject: formData.subject,
            topic: formData.topic
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const lessonPlan = data.content[0].text;
      
      setGeneratedPlan(lessonPlan);
      
      trackEvent('lesson_generation_success', {
        template: selectedTemplate,
        responseLength: lessonPlan.length,
        tokensRemaining: usageData.tokensAvailable - usageData.tokensUsed,
        weeklyUsage: usageData.weeklyUsed
      });
      
    } catch (error) {
      console.error("Error generating lesson plan:", error);
      
      const refundData = {
        ...usageData,
        tokensUsed: Math.max(0, usageData.tokensUsed - 1),
        weeklyUsed: Math.max(0, usageData.weeklyUsed - 1)
      };
      setUsageData(refundData);
      localStorage.setItem('rwUsageData', JSON.stringify(refundData));
      
      trackEvent('lesson_generation_error', { error: error.message });
      setGeneratedPlan(`# Error Generating Lesson Plan

We encountered an issue creating your lesson plan. Your token has been refunded.

**Error Details:** ${error.message}

**Your Input:**
- Template: ${selectedTemplate}
- Grade: ${formData.gradeLevel}
- Subject: ${formData.subject}
- Topic: ${formData.topic}

Please try again in a few moments. If the problem persists, contact support.`);
    }
    
    setIsGenerating(false);
  };

  const UpgradeModal = () => (
    <div className={`fixed inset-0 z-50 ${showUpgrade ? 'visible' : 'invisible'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowUpgrade(false)} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-w-full mx-4">
        <div className="bg-white rounded-2xl p-6 shadow-2xl border border-amber-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-300">
              <Sparkles size={32} className="text-green-800" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Unlock Unlimited Lesson Plans</h3>
            <p className="text-green-700 text-sm">You've used your free lesson plans. Upgrade for unlimited access!</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Individual Plan - $19/month</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✓ 25 lesson plans per week (50 tokens)</li>
                <li>✓ All 5 trauma-informed templates</li>
                <li>✓ Download & export features</li>
                <li>✓ Multi-device access</li>
                <li>✓ Email support</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
              <h4 className="font-bold text-amber-800 mb-2">Root Work Framework Hub - $25/month</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>✓ Unlimited lesson plans (999 tokens)</li>
                <li>✓ Student portfolio management</li>
                <li>✓ 5 R's journey tracking</li>
                <li>✓ Professional development access</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => {
                trackEvent('upgrade_dismissed');
                setShowUpgrade(false);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Maybe Later
            </button>
            <button 
              onClick={() => {
                trackEvent('upgrade_clicked', { plan: 'individual' });
                upgradeSubscription('individual');
                setShowUpgrade(false);
                alert('Upgrade successful! You now have 25 lesson plans per week.');
              }}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const RateLimitModal = () => (
    <div className={`fixed inset-0 z-50 ${showRateLimit ? 'visible' : 'invisible'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowRateLimit(false)} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-w-full mx-4">
        <div className="bg-white rounded-2xl p-6 shadow-2xl border border-red-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Usage Limit Reached</h3>
            <p className="text-red-700 text-sm">{rateLimitMessage}</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setShowRateLimit(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button 
              onClick={() => {
                setShowRateLimit(false);
                setShowUpgrade(true);
              }}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const Header = () => (
    <div className="bg-gradient-to-r from-green-800 to-green-700 shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border-2 border-amber-300 shadow-md cursor-pointer"
            onDoubleClick={resetUsageData}
            title="Double-click to reset usage (testing only)"
          >
            <TreePine size={20} className="text-green-800" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-amber-100 tracking-wide">ROOT WORK</h1>
            <p className="text-xs text-amber-200 -mt-1 font-medium">AI Lesson Plan Generator</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-2 bg-green-600 bg-opacity-30 rounded-full px-3 py-1">
              <span className="text-xs text-amber-100">Tokens:</span>
              <span className="text-xs font-bold text-amber-100">
                {usageData.tokensAvailable - usageData.tokensUsed}/{usageData.tokensAvailable}
              </span>
            </div>
            <div className="text-xs text-amber-200 mt-1">
              Weekly: {usageData.weeklyUsed}/{usageData.weeklyLimit}
            </div>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="p-2">
            <Menu size={20} className="text-amber-100" />
          </button>
        </div>
      </div>
      
      <div className="sm:hidden mt-3 flex justify-center">
        <div className="bg-green-600 bg-opacity-30 rounded-full px-4 py-2">
          <span className="text-xs text-amber-100">
            Tokens: {usageData.tokensAvailable - usageData.tokensUsed}/{usageData.tokensAvailable} • 
            Weekly: {usageData.weeklyUsed}/{usageData.weeklyLimit}
          </span>
        </div>
      </div>
    </div>
  );

  const SideMenu = () => (
    <div className={`fixed inset-0 z-40 ${showMenu ? 'visible' : 'invisible'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMenu(false)} />
      <div className={`absolute right-0 top-0 h-full w-80 bg-gradient-to-b from-amber-50 to-yellow-50 border-l border-green-200 transform transition-transform duration-300 ${showMenu ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-green-300 bg-gradient-to-r from-green-800 to-green-700">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border border-amber-300">
                <TreePine size={16} className="text-green-800" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-100">ROOT WORK</h2>
                <p className="text-xs text-amber-200 -mt-1">AI Lesson Planner</p>
              </div>
            </div>
            <button onClick={() => setShowMenu(false)}>
              <X size={20} className="text-amber-100" />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl p-4 border border-amber-200">
            <h3 className="font-bold text-green-800 mb-2">Account Status</h3>
            <div className="text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                usageData.subscriptionLevel === 'free' ? 'bg-gray-100 text-gray-700' :
                usageData.subscriptionLevel === 'individual' ? 'bg-green-100 text-green-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {usageData.subscriptionLevel.toUpperCase()}
                {usageData.subscriptionLevel === 'free' ? ' TRIAL' : ' PLAN'}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-amber-200">
            <h3 className="font-bold text-green-800 mb-2">Usage Status</h3>
            <div className="text-sm text-green-700 space-y-2">
              <div className="flex justify-between">
                <span>Tokens Available:</span>
                <span className="font-bold">{usageData.tokensAvailable - usageData.tokensUsed}/{usageData.tokensAvailable}</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-600 to-green-700 h-2 rounded-full transition-all" 
                  style={{width: `${((usageData.tokensAvailable - usageData.tokensUsed)/usageData.tokensAvailable)*100}%`}}
                ></div>
              </div>
              <div className="flex justify-between text-xs">
                <span>Weekly Used:</span>
                <span>{usageData.weeklyUsed}/{usageData.weeklyLimit}</span>
              </div>
              {usageData.lastResetDate && (
                <div className="text-xs text-green-600">
                  Resets: {new Date(new Date(usageData.lastResetDate).getTime() + 7*24*60*60*1000).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
              <Award size={16} />
              Upgrade Benefits
            </h3>
            <ul className="text-xs text-green-700 space-y-1">
              <li>✓ Unlimited lesson plans</li>
              <li>✓ Advanced templates</li>
              <li>✓ Export to Google Docs</li>
              <li>✓ Save lesson library</li>
            </ul>
            <button 
              onClick={() => {
                upgradeSubscription('individual');
                setShowMenu(false);
                alert('Upgrade successful! You now have 25 lesson plans per week.');
              }}
              className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold"
            >
              Upgrade Now
            </button>
          </div>
          
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <Compass size={16} />
              Root Work Hub
            </h3>
            <p className="text-xs text-amber-700 mb-3">Get the complete platform with student tracking, portfolios, and professional development.</p>
            <button 
              onClick={() => {
                trackEvent('hub_interest');
                alert('Would redirect to Root Work Framework Hub');
              }}
              className="w-full bg-amber-600 text-white py-2 rounded-lg text-xs font-semibold"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (generatedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50">
        <Header />
        <SideMenu />
        <UpgradeModal />
        <RateLimitModal />
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-green-800">Generated Lesson Plan</h2>
            <button 
              onClick={() => {
                setGeneratedPlan('');
                setSelectedTemplate('');
                setFormData({
                  gradeLevel: '', subject: '', topic: '', duration: '90',
                  studentContext: '', learningObjectives: '', traumaConsiderations: '',
                  culturalAssets: '', urbanIntegration: '', assessmentType: ''
                });
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Create New Plan
            </button>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-green-800 font-mono leading-relaxed">
              {generatedPlan}
            </pre>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => {
                trackEvent('lesson_plan_download', { template: selectedTemplate });
                const blob = new Blob([generatedPlan], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RootWork_LessonPlan_${selectedTemplate}_${formData.gradeLevel}_${formData.subject}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <Download size={20} />
              Download Plan
            </button>
            <button 
              onClick={() => {
                trackEvent('lesson_plan_share');
                if (navigator.share) {
                  navigator.share({
                    title: 'Root Work Lesson Plan',
                    text: generatedPlan.substring(0, 500) + '...',
                  });
                } else {
                  alert('Sharing functionality would copy to clipboard or email');
                }
              }}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700"
            >
              <Share2 size={20} />
              Share Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTemplate) {
    const template = templates.find(t => t.id === selectedTemplate);
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50">
        <Header />
        <SideMenu />
        <UpgradeModal />
        <RateLimitModal />
        
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedTemplate('')} className="p-2 hover:bg-green-100 rounded-lg">
              <X size={20} className="text-green-700" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-green-800">{template.title}</h2>
              <p className="text-sm text-green-700">{template.description}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200 space-y-4">
            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Grade Level *</label>
              <input
                type="text"
                value={formData.gradeLevel}
                onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                placeholder="e.g., 3rd Grade, 10th Grade, Mixed Ages"
                className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Subject *</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
              >
                <option value="">Select Subject</option>
                <option value="English Language Arts">English Language Arts</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="Social Studies">Social Studies</option>
                <option value="STEAM Integration">STEAM Integration</option>
                <option value="Arts">Arts</option>
                <option value="Physical Education">Physical Education</option>
                <option value="Special Education">Special Education</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Topic/Theme *</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({...formData, topic: e.target.value})}
                placeholder="e.g., Community Gardens, Cultural Identity, Urban Ecology"
                className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Duration</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
              >
                <option value="45">45 minutes</option>
                <option value="90">90 minutes (block)</option>
                <option value="multi-day">Multi-day unit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Student Context</label>
              <textarea
                value={formData.studentContext}
                onChange={(e) => setFormData({...formData, studentContext: e.target.value})}
                placeholder="Describe your students' backgrounds, strengths, and any considerations..."
                className="w-full p-3 border border-green-300 rounded-lg h-20 focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Learning Objectives</label>
              <textarea
                value={formData.learningObjectives}
                onChange={(e) => setFormData({...formData, learningObjectives: e.target.value})}
                placeholder="What should students know or be able to do by the end?"
                className="w-full p-3 border border-green-300 rounded-lg h-20 focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Cultural Assets & Community Connections</label>
              <textarea
                value={formData.culturalAssets}
                onChange={(e) => setFormData({...formData, culturalAssets: e.target.value})}
                placeholder="Local cultural wealth, community partnerships, family strengths to include..."
                className="w-full p-3 border border-green-300 rounded-lg h-20 focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-800 mb-2">Assessment Approach</label>
              <select
                value={formData.assessmentType}
                onChange={(e) => setFormData({...formData, assessmentType: e.target.value})}
                className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
              >
                <option value="">Select Assessment Type</option>
                <option value="formative">Formative (ongoing checks)</option>
                <option value="summative">Summative (end product)</option>
                <option value="portfolio">Portfolio-based</option>
                <option value="peer">Peer assessment</option>
                <option value="self-reflection">Self-reflection</option>
              </select>
            </div>

            <button
              onClick={generateLessonPlan}
              disabled={!formData.gradeLevel || !formData.subject || !formData.topic || isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg ${
                (!formData.gradeLevel || !formData.subject || !formData.topic || isGenerating)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Your Root Work Lesson Plan...
                </div>
              ) : (
                `Generate Lesson Plan ${
                  (usageData.tokensAvailable - usageData.tokensUsed) <= 0 
                    ? '(Upgrade Required)' 
                    : `(${usageData.tokensAvailable - usageData.tokensUsed} tokens left)`
                }`
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50">
      <Header />
      <SideMenu />
      <UpgradeModal />
      <RateLimitModal />
      
      <div className="p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 border-3 border-amber-300 shadow-lg">
            <TreePine size={40} className="text-green-800" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2 tracking-wide">ROOT WORK</h1>
          <h2 className="text-xl text-green-700 mb-3">AI Lesson Plan Generator</h2>
          <p className="text-green-600 text-sm max-w-md mx-auto leading-relaxed">
            Create trauma-informed, culturally responsive lesson plans using the proven 5 R's methodology
          </p>
          <div className="mt-4 bg-green-100 inline-block px-4 py-2 rounded-full border border-green-300">
            <span className="text-sm font-semibold text-green-800">
              {usageData.tokensAvailable - usageData.tokensUsed} tokens remaining this week
            </span>
          </div>
        </div>

        {/* Template Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-green-800 text-center">Choose Your Template</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {templates.map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    trackEvent('template_selected', { 
                      template: template.id,
                      templateName: template.title 
                    });
                    setSelectedTemplate(template.id);
                  }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200 hover:border-green-300 hover:shadow-xl transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${template.color} flex items-center justify-center shadow-md`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-800 text-lg mb-1">{template.title}</h4>
                      <p className="text-sm text-green-700 mb-2">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-green-600">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {template.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target size={12} />
                          {template.bestFor}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <h3 className="font-bold text-green-800 mb-4 text-center flex items-center justify-center gap-2">
            <Zap size={20} />
            Root Work Framework Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} className="text-green-600" />
              5 R's methodology integration
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} className="text-green-600" />
              Trauma-informed practices
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} className="text-green-600" />
              Cultural responsiveness
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} className="text-green-600" />
              MTSS scaffolding included
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} className="text-green-600" />
              Standards-aligned content
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} className="text-green-600" />
              Urban integration ready
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-4">
          <p className="text-sm text-green-600 mb-4">
            Ready to transform your teaching with healing-centered education?
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 200, behavior: 'smooth' })}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Start Creating Lesson Plans
          </button>
        </div>
      </div>
    </div>
  );
};

export default RootWorkLessonPlanner;

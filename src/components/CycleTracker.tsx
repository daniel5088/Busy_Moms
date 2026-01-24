import React, { useState, useEffect } from 'react';
import { Calendar, Droplet, Heart, Activity, Brain, Zap, Moon, Sun, TrendingUp, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { cycleTrackerService, CycleData, CycleSymptom, CycleHistory } from '../services/cycleTrackerService';
import { useAuth } from '../hooks/useAuth';

const CycleTracker = () => {
  const { user } = useAuth();
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [symptoms, setSymptoms] = useState<Record<string, CycleSymptom>>({});
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [symptomAnalysis, setSymptomAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('');
  const [cycleHistory, setCycleHistory] = useState<CycleHistory[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setInitialLoading(true);
      const [cycleData, symptomsData, historyData] = await Promise.all([
        cycleTrackerService.getCycleData(),
        cycleTrackerService.getSymptoms(),
        cycleTrackerService.getCycleHistory(),
      ]);

      if (cycleData) {
        setPeriodStart(new Date(cycleData.period_start_date));
        setCycleLength(cycleData.cycle_length);
        setPeriodLength(cycleData.period_length);
      }

      const symptomsMap: Record<string, CycleSymptom> = {};
      symptomsData.forEach(symptom => {
        symptomsMap[symptom.symptom_date] = symptom;
      });
      setSymptoms(symptomsMap);

      setCycleHistory(historyData);
    } catch (error) {
      console.error('Error loading cycle data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const calculatePhase = (date: Date) => {
    if (!periodStart) return null;
    const daysSinceStart = Math.floor((date.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
    if (dayInCycle < periodLength) return { phase: 'period', cycleDay: dayInCycle + 1 };
    if (dayInCycle < 14) return { phase: 'follicular', cycleDay: dayInCycle + 1 };
    if (dayInCycle >= 12 && dayInCycle <= 16) return { phase: 'ovulation', cycleDay: dayInCycle + 1 };
    return { phase: 'luteal', cycleDay: dayInCycle + 1 };
  };

  const getAIInsights = async () => {
    setLoading(true);
    setLoadingType('insights');
    const currentPhase = calculatePhase(new Date());
    if (!currentPhase) {
      alert('Set your period start date first!');
      setLoading(false);
      return;
    }
    try {
      const symptomsList = Object.entries(symptoms)
        .filter(([_, data]) => data.symptoms?.length > 0)
        .map(([date, data]) => ({ date, symptoms: data.symptoms }));

      const insights = await cycleTrackerService.callEdgeFunction('get_insights', {
        currentPhase: currentPhase.phase as any,
        cycleDay: currentPhase.cycleDay,
        cycleLength,
        periodLength,
        symptoms: symptomsList,
        cycleHistory,
      });
      setAiInsights(insights);
    } catch (error) {
      console.error('Error getting insights:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to get AI insights: ${errorMessage}\n\nPlease ensure the Wellness feature is properly set up by running the database migration.`);
    }
    setLoading(false);
    setLoadingType('');
  };

  const predictNextPeriod = async () => {
    setLoading(true);
    setLoadingType('prediction');
    const currentPhase = calculatePhase(new Date());
    if (!currentPhase) {
      alert('Set your period start date first!');
      setLoading(false);
      return;
    }
    try {
      const predictionData = await cycleTrackerService.callEdgeFunction('predict_period', {
        currentPhase: currentPhase.phase as any,
        cycleDay: currentPhase.cycleDay,
        cycleLength,
        periodLength,
        cycleHistory,
      });
      setPrediction(predictionData);
    } catch (error) {
      console.error('Error predicting period:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to predict next period: ${errorMessage}\n\nPlease ensure the Wellness feature is properly set up by running the database migration.`);
    }
    setLoading(false);
    setLoadingType('');
  };

  const analyzeSymptoms = async () => {
    setLoading(true);
    setLoadingType('analysis');
    const symptomsList = Object.entries(symptoms)
      .filter(([_, data]) => data.symptoms?.length > 0)
      .map(([date, data]) => ({ date, symptoms: data.symptoms }));
    if (symptomsList.length === 0) {
      alert('Log some symptoms first!');
      setLoading(false);
      return;
    }
    const currentPhase = calculatePhase(new Date());
    try {
      const analysis = await cycleTrackerService.callEdgeFunction('analyze_symptoms', {
        currentPhase: currentPhase?.phase as any || 'period',
        cycleDay: currentPhase?.cycleDay || 0,
        cycleLength,
        periodLength,
        symptoms: symptomsList,
      });
      setSymptomAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to analyze symptoms: ${errorMessage}\n\nPlease ensure the Wellness feature is properly set up by running the database migration.`);
    }
    setLoading(false);
    setLoadingType('');
  };

  const logSymptom = async (symptom: string) => {
    const dateKey = selectedDate.toISOString().split('T')[0];
    const currentSymptoms = symptoms[dateKey]?.symptoms || [];
    const updatedSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter(s => s !== symptom)
      : [...currentSymptoms, symptom];

    try {
      await cycleTrackerService.saveSymptom({
        symptom_date: dateKey,
        symptoms: updatedSymptoms,
      });

      setSymptoms({
        ...symptoms,
        [dateKey]: {
          ...symptoms[dateKey],
          symptom_date: dateKey,
          symptoms: updatedSymptoms,
        },
      });
    } catch (error) {
      console.error('Error saving symptom:', error);
    }
  };

  const handlePeriodStart = async (date: Date) => {
    try {
      setPeriodStart(date);

      await cycleTrackerService.saveCycleData({
        period_start_date: date.toISOString().split('T')[0],
        cycle_length: cycleLength,
        period_length: periodLength,
      });

      await cycleTrackerService.addCycleHistory({
        period_start_date: date.toISOString().split('T')[0],
        cycle_length: cycleLength,
        period_length: periodLength,
      });

      const historyData = await cycleTrackerService.getCycleHistory();
      setCycleHistory(historyData);
    } catch (error) {
      console.error('Error saving period start:', error);
    }
  };

  const updateCycleSettings = async (newCycleLength: number, newPeriodLength: number) => {
    try {
      setCycleLength(newCycleLength);
      setPeriodLength(newPeriodLength);

      if (periodStart) {
        await cycleTrackerService.saveCycleData({
          period_start_date: periodStart.toISOString().split('T')[0],
          cycle_length: newCycleLength,
          period_length: newPeriodLength,
        });
      }
    } catch (error) {
      console.error('Error updating cycle settings:', error);
    }
  };

  const getPhaseColor = (phase: string) => {
    const colors = {
      period: 'bg-pink-500/20 border-pink-500',
      follicular: 'bg-teal-500/20 border-teal-500',
      ovulation: 'bg-purple-500/20 border-purple-500',
      luteal: 'bg-blue-500/20 border-blue-500'
    };
    return colors[phase as keyof typeof colors] || 'bg-slate-700/50 border-slate-600';
  };

  const getEnergyIcon = (level: string) => {
    if (level === 'high') return <Zap className="w-5 h-5 text-yellow-400" />;
    if (level === 'low') return <Moon className="w-5 h-5 text-blue-400" />;
    return <Sun className="w-5 h-5 text-orange-400" />;
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`e-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const phaseInfo = calculatePhase(date);
      const isToday = new Date().toDateString() === date.toDateString();
      const dateKey = date.toISOString().split('T')[0];
      const hasSymptoms = symptoms[dateKey]?.symptoms?.length > 0;

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-sm font-medium transition-all relative
            ${phaseInfo ? getPhaseColor(phaseInfo.phase) : 'bg-slate-800/50 border-slate-700'}
            ${isToday ? 'ring-2 ring-white/50' : ''}
            hover:scale-105`}
        >
          <span>{day}</span>
          {hasSymptoms && <div className="absolute bottom-1 w-1 h-1 bg-pink-400 rounded-full" />}
        </button>
      );
    }
    return days;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading wellness data...</p>
        </div>
      </div>
    );
  }

  const nextPeriod = periodStart ? new Date(periodStart.getTime() + cycleLength * 24 * 60 * 60 * 1000) : null;
  const currentPhase = selectedDate ? calculatePhase(selectedDate) : null;
  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const selectedSymptoms = symptoms[selectedDateKey]?.symptoms || [];
  const commonSymptoms = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood Swings', 'Breast Tenderness', 'Acne', 'Back Pain', 'Cravings', 'Insomnia'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-4 md:p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Smart Cycle Tracker</h1>
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={getAIInsights} disabled={loading && loadingType === 'insights'}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 text-sm text-white">
              {loading && loadingType === 'insights' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
              ) : (
                <><Brain className="w-4 h-4" />Get Insights</>
              )}
            </button>
            <button onClick={predictNextPeriod} disabled={loading && loadingType === 'prediction'}
              className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 text-sm text-white">
              {loading && loadingType === 'prediction' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
              ) : (
                <><TrendingUp className="w-4 h-4" />Predict</>
              )}
            </button>
            <button onClick={analyzeSymptoms} disabled={loading && loadingType === 'analysis'}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 text-sm text-white">
              {loading && loadingType === 'analysis' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Analyze</>
              )}
            </button>
          </div>
        </div>

        {aiInsights && (
          <div className="bg-white dark:bg-gradient-to-br dark:from-purple-900/40 dark:to-pink-900/40 rounded-xl p-4 md:p-6 border border-purple-200 dark:border-purple-500/30 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold">AI Insights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getEnergyIcon(aiInsights.energyLevel)}
                  <h3 className="font-semibold">Current Phase</h3>
                </div>
                <p className="text-gray-600 dark:text-slate-300 text-sm mb-4">{aiInsights.currentPhaseInsight}</p>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />Mood
                </h3>
                <p className="text-gray-600 dark:text-slate-300 text-sm">{aiInsights.moodInsight}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />Tips
                </h3>
                <ul className="space-y-1 mb-4">
                  {aiInsights.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span><span>{rec}</span>
                    </li>
                  ))}
                </ul>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-400" />Exercise
                </h3>
                <p className="text-gray-600 dark:text-slate-300 text-sm">{aiInsights.exerciseSuggestion}</p>
              </div>
            </div>
            {aiInsights.fertilityWindow && (
              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-500/30">
                <h3 className="font-semibold mb-2">Fertility Window</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Peak: {aiInsights.fertilityWindow.peak} | Window: {aiInsights.fertilityWindow.start} to {aiInsights.fertilityWindow.end}
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-500/30">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />What's Next
              </h3>
              <p className="text-gray-600 dark:text-slate-300 text-sm">{aiInsights.predictions}</p>
            </div>
          </div>
        )}

        {prediction && (
          <div className="bg-white dark:bg-gradient-to-br dark:from-teal-900/40 dark:to-blue-900/40 rounded-xl p-4 md:p-6 border border-teal-200 dark:border-teal-500/30 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-semibold">Period Prediction</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm text-gray-500 dark:text-slate-400 mb-1">Next Period</h3>
                <p className="text-2xl font-bold text-teal-500">{prediction.nextPeriodDate}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Confidence: {prediction.confidenceLevel}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-500 dark:text-slate-400 mb-2">Expected Symptoms</h3>
                <div className="flex flex-wrap gap-2">
                  {prediction.predictedSymptoms.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-teal-500/20 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="space-y-1">
                {prediction.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-slate-300 flex items-start gap-2">
                    <span className="text-teal-400">•</span><span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {symptomAnalysis && (
          <div className="bg-white dark:bg-gradient-to-br dark:from-pink-900/40 dark:to-purple-900/40 rounded-xl p-4 md:p-6 border border-pink-200 dark:border-pink-500/30 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-pink-400" />
              <h2 className="text-xl font-semibold">Symptom Analysis</h2>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold mb-3">Patterns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {symptomAnalysis.patterns.map((p: any, i: number) => (
                  <div key={i} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-pink-200 dark:border-pink-500/30">
                    <p className="font-semibold text-pink-500">{p.symptom}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">Frequency: {p.frequency}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">Phase: {p.phase}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Insights</h3>
              <ul className="space-y-1">
                {symptomAnalysis.insights.map((ins: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-slate-300 flex items-start gap-2">
                    <span className="text-pink-400">•</span><span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Management</h3>
              <ul className="space-y-1">
                {symptomAnalysis.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-slate-300 flex items-start gap-2">
                    <span className="text-pink-400">•</span><span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-pink-500/20 p-2 rounded-lg">
                <Droplet className="w-4 h-4 md:w-5 md:h-5 text-pink-400" />
              </div>
              <span className="text-gray-500 dark:text-slate-400 text-xs md:text-sm">Next Period</span>
            </div>
            <p className="text-lg md:text-xl font-bold">
              {nextPeriod ? nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set date'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Heart className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              </div>
              <span className="text-gray-500 dark:text-slate-400 text-xs md:text-sm">Cycle</span>
            </div>
            <p className="text-lg md:text-xl font-bold">{cycleLength}d</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-teal-500/20 p-2 rounded-lg">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-teal-400" />
              </div>
              <span className="text-gray-500 dark:text-slate-400 text-xs md:text-sm">Phase</span>
            </div>
            <p className="text-lg md:text-xl font-bold capitalize truncate">
              {currentPhase ? currentPhase.phase : 'N/A'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              </div>
              <span className="text-gray-500 dark:text-slate-400 text-xs md:text-sm">Day</span>
            </div>
            <p className="text-lg md:text-xl font-bold">
              {currentPhase ? currentPhase.cycleDay : '-'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base">←</button>
              <h2 className="text-lg md:text-xl font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendar()}</div>
            <div className="mt-4 md:mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[
                { color: 'pink', label: 'Period' },
                { color: 'teal', label: 'Follicular' },
                { color: 'purple', label: 'Ovulation' },
                { color: 'blue', label: 'Luteal' }
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded bg-${color}-500/20 border-2 border-${color}-500`} />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Symptoms</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commonSymptoms.map(symptom => (
                <button key={symptom} onClick={() => logSymptom(symptom)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                    selectedSymptoms.includes(symptom)
                      ? 'bg-pink-500/30 border-2 border-pink-500'
                      : 'bg-gray-100 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}>
                  <span className="text-sm">{symptom}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">Last Period Start</label>
              <input type="date" value={periodStart ? periodStart.toISOString().split('T')[0] : ''}
                onChange={(e) => handlePeriodStart(new Date(e.target.value))}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">Cycle Length</label>
              <input type="number" value={cycleLength}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateCycleSettings(val, periodLength);
                }}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" min="20" max="40" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">Period Length</label>
              <input type="number" value={periodLength}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateCycleSettings(cycleLength, val);
                }}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" min="2" max="10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CycleTracker;

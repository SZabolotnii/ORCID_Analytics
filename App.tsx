import React, { useState, useMemo } from 'react';
import { 
  Search, Upload, FileText, Users, BookOpen, TrendingUp, 
  Download, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { AnalysisStats, OrcidProfileData } from './types';
import { fetchOrcidData, parseCsvFile } from './services/orcidService';
import { AnalysisCharts } from './components/AnalysisCharts';
import ChatBot from './components/ChatBot';

function App() {
  // State
  const [inputType, setInputType] = useState<'single' | 'batch'>('single');
  const [singleId, setSingleId] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrcidProfileData[]>([]);
  
  // Computed Stats
  const stats: AnalysisStats | null = useMemo(() => {
    if (data.length === 0) return null;

    const totalResearchers = data.length;
    let totalPubs = 0;
    const yearCounts: Record<number, number> = {};
    const typeCounts: Record<string, number> = {};

    data.forEach(profile => {
      totalPubs += profile.works.length;
      profile.works.forEach(work => {
        // Year Stats
        if (work.year) {
            yearCounts[work.year] = (yearCounts[work.year] || 0) + 1;
        }
        // Type Stats
        const type = work.type || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
    });

    // Format for Recharts
    const publicationsByYear = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);

    const publicationsByType = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count); // Descending

    return {
      totalResearchers,
      totalPublications: totalPubs,
      avgPublications: totalResearchers > 0 ? totalPubs / totalResearchers : 0,
      publicationsByYear,
      publicationsByType,
      processedProfiles: data
    };
  }, [data]);

  // Handlers
  const handleSingleAnalyze = async () => {
    if (!singleId.trim()) return;
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const result = await fetchOrcidData(singleId);
      setData([result]);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze ID');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleBatchAnalyze = async () => {
    if (!csvFile) return;
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const ids = await parseCsvFile(csvFile);
      if (ids.length === 0) throw new Error("No valid ORCID IDs found in file.");
      
      const results = [];
      // Process in sequence to avoid hitting rate limits too hard, 
      // though parallel w/ limit is better for production.
      for (const id of ids) {
        try {
            const result = await fetchOrcidData(id);
            results.push(result);
        } catch (e) {
            console.warn(`Skipping ${id} due to error`);
        }
      }
      setData(results);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              ORCID Analytics Agent
            </h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            v1.0 • Integrated with Gemini Business
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex gap-4 mb-6 border-b border-gray-100 pb-2">
            <button 
              onClick={() => setInputType('single')}
              className={`pb-2 px-4 text-sm font-medium transition-colors relative ${
                inputType === 'single' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Single Researcher
              {inputType === 'single' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>
              )}
            </button>
            <button 
              onClick={() => setInputType('batch')}
              className={`pb-2 px-4 text-sm font-medium transition-colors relative ${
                inputType === 'batch' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Batch Analysis (CSV)
              {inputType === 'batch' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>
              )}
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            {inputType === 'single' ? (
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">ORCID ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="e.g., 0000-0002-1825-0097"
                    value={singleId}
                    onChange={(e) => setSingleId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-300 rounded-xl cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">File must contain a column named "orcid"</p>
              </div>
            )}
            
            <button 
              onClick={inputType === 'single' ? handleSingleAnalyze : handleBatchAnalyze}
              disabled={loading || (inputType === 'single' && !singleId) || (inputType === 'batch' && !csvFile)}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <TrendingUp className="w-5 h-5" />}
              Analyze
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </section>

        {/* Results Area */}
        {loading && (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900">Gathering Intelligence...</h3>
            <p className="text-gray-500">Querying ORCID databases and calculating statistics</p>
          </div>
        )}

        {!loading && stats && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Analysis Report</h2>
              <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors">
                <Download className="w-4 h-4" /> Export Report
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Researchers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalResearchers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Publications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPublications}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Avg. per Person</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgPublications.toFixed(1)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Active Years</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.publicationsByYear.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <AnalysisCharts data={stats} />

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800">Researcher Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">ORCID ID</th>
                      <th className="px-6 py-3">Name (Approx)</th>
                      <th className="px-6 py-3 text-right">Publications</th>
                      <th className="px-6 py-3 text-right">Latest Work</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.processedProfiles.map((profile) => (
                      <tr key={profile.orcidId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-indigo-600">{profile.orcidId}</td>
                        <td className="px-6 py-4 text-gray-900">{profile.fullName}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{profile.works.length}</td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {profile.works.length > 0 
                            ? Math.max(...profile.works.map(w => w.year || 0)) || 'N/A'
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Floating Chat Bot */}
      <ChatBot contextData={stats} />
    </div>
  );
}

export default App;
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { ArrowLeft, Plus, Edit, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { ScoreboardTemplate } from '@/shared/types';

export default function TemplateManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ScoreboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScoreboardTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sport_type: '',
    description: '',
    default_time: 1200,
    time_format: 'mm:ss',
    has_halves: true,
    has_quarters: false,
    has_periods: false,
    period_count: 2,
    period_label: 'Half',
    has_timeouts: true,
    timeouts_per_period: 2,
    has_blitzes: false,
    blitzes_per_period: 0,
    has_flag_football_downs: false,
    has_fouls: false,
    fouls_limit: 0,
    has_possession: false,
    // Baseball
    has_innings: false,
    has_balls_strikes: false,
    has_outs: false,
    has_pitch_count: false,
    // Tackle Football
    has_downs: false,
    has_yards: false,
    // Hockey
    has_penalties: false,
    has_penalty_time: false,
    has_shots_on_goal: false,
    // Tennis
    has_games_sets: false,
  });

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
        if (data.role !== 'admin') {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      navigate('/');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchCurrentUser();
  }, [user, navigate]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchTemplates();
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingTemplate
      ? `/api/templates/${editingTemplate.id}`
      : '/api/templates';

    const method = editingTemplate ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchTemplates();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleEdit = (template: ScoreboardTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      sport_type: template.sport_type,
      description: template.description || '',
      default_time: template.default_time,
      time_format: template.time_format,
      has_halves: !!template.has_halves,
      has_quarters: !!template.has_quarters,
      has_periods: !!template.has_periods,
      period_count: template.period_count,
      period_label: template.period_label,
      has_timeouts: !!template.has_timeouts,
      timeouts_per_period: template.timeouts_per_period,
      has_blitzes: !!template.has_blitzes,
      blitzes_per_period: template.blitzes_per_period,
      has_flag_football_downs: !!template.has_flag_football_downs,
      has_fouls: !!template.has_fouls,
      fouls_limit: template.fouls_limit,
      has_possession: !!template.has_possession,
      // Baseball
      has_innings: !!template.has_innings,
      has_balls_strikes: !!template.has_balls_strikes,
      has_outs: !!template.has_outs,
      has_pitch_count: !!template.has_pitch_count,
      // Tackle Football
      has_downs: !!template.has_downs,
      has_yards: !!template.has_yards,
      // Hockey
      has_penalties: !!template.has_penalties,
      has_penalty_time: !!template.has_penalty_time,
      has_shots_on_goal: !!template.has_shots_on_goal,
      // Tennis
      has_games_sets: !!template.has_games_sets,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sport_type: '',
      description: '',
      default_time: 1200,
      time_format: 'mm:ss',
      has_halves: true,
      has_quarters: false,
      has_periods: false,
      period_count: 2,
      period_label: 'Half',
      has_timeouts: true,
      timeouts_per_period: 2,
      has_blitzes: false,
      blitzes_per_period: 0,
      has_flag_football_downs: false,
      has_fouls: false,
      fouls_limit: 0,
      has_possession: false,
      // Baseball
      has_innings: false,
      has_balls_strikes: false,
      has_outs: false,
      has_pitch_count: false,
      // Tackle Football
      has_downs: false,
      has_yards: false,
      // Hockey
      has_penalties: false,
      has_penalty_time: false,
      has_shots_on_goal: false,
      // Tennis
      has_games_sets: false,
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-amber-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mb-6 bg-slate-800/50 border-amber-400/30 text-amber-400 hover:bg-slate-700/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2 font-['Orbitron']">
            Scoreboard Templates
          </h1>
          <p className="text-slate-300">
            Create and manage scoreboard templates for different sports
          </p>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-bold"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Cancel' : 'Create New Template'}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 bg-slate-800/50 border-amber-400/30">
            <CardHeader>
              <CardTitle className="text-amber-400">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure the scoreboard settings for this sport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Sport Type
                    </label>
                    <input
                      type="text"
                      value={formData.sport_type}
                      onChange={(e) => setFormData({ ...formData, sport_type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Default Time (seconds)
                    </label>
                    <input
                      type="number"
                      value={formData.default_time}
                      onChange={(e) => setFormData({ ...formData, default_time: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Period Count
                    </label>
                    <input
                      type="number"
                      value={formData.period_count}
                      onChange={(e) => setFormData({ ...formData, period_count: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Period Label
                    </label>
                    <input
                      type="text"
                      value={formData.period_label}
                      onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_timeouts}
                        onChange={(e) => setFormData({ ...formData, has_timeouts: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Has Timeouts</span>
                    </label>

                    {formData.has_timeouts && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Timeouts per Period
                        </label>
                        <input
                          type="number"
                          value={formData.timeouts_per_period}
                          onChange={(e) => setFormData({ ...formData, timeouts_per_period: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Flag Football Options */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Flag Football Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.has_blitzes}
                          onChange={(e) => setFormData({ ...formData, has_blitzes: e.target.checked })}
                          className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                        />
                        <span className="text-slate-300">Track Blitzes</span>
                      </label>

                      {formData.has_blitzes && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Blitzes per Period
                          </label>
                          <input
                            type="number"
                            value={formData.blitzes_per_period}
                            onChange={(e) => setFormData({ ...formData, blitzes_per_period: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                      )}
                    </div>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_flag_football_downs}
                        onChange={(e) => setFormData({ ...formData, has_flag_football_downs: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Downs</span>
                    </label>
                  </div>
                </div>

                {/* Baseball / Softball Options */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Baseball / Softball Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_innings}
                        onChange={(e) => setFormData({ ...formData, has_innings: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Innings</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_balls_strikes}
                        onChange={(e) => setFormData({ ...formData, has_balls_strikes: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Balls & Strikes</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_outs}
                        onChange={(e) => setFormData({ ...formData, has_outs: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Outs</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_pitch_count}
                        onChange={(e) => setFormData({ ...formData, has_pitch_count: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Pitch Count</span>
                    </label>
                  </div>
                </div>

                {/* Basketball Options */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Basketball Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_fouls}
                        onChange={(e) => setFormData({ ...formData, has_fouls: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Fouls & Bonus</span>
                    </label>

                    {formData.has_fouls && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Fouls for Bonus
                        </label>
                        <input
                          type="number"
                          value={formData.fouls_limit}
                          onChange={(e) => setFormData({ ...formData, fouls_limit: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tackle Football Options */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Tackle Football Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_downs}
                        onChange={(e) => setFormData({ ...formData, has_downs: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Down & Distance</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_yards}
                        onChange={(e) => setFormData({ ...formData, has_yards: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Ball Position</span>
                    </label>
                  </div>
                </div>

                {/* Hockey Options */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Hockey Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_penalties}
                        onChange={(e) => setFormData({ ...formData, has_penalties: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Penalties</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_penalty_time}
                        onChange={(e) => setFormData({ ...formData, has_penalty_time: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Penalty Time</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_shots_on_goal}
                        onChange={(e) => setFormData({ ...formData, has_shots_on_goal: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Shots on Goal</span>
                    </label>
                  </div>
                </div>

                {/* Tennis Options */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">Tennis Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.has_games_sets}
                        onChange={(e) => setFormData({ ...formData, has_games_sets: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Track Games & Sets</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-bold"
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    className="bg-slate-800/50 border-amber-400/30 text-amber-400 hover:bg-slate-700/50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="bg-slate-800/50 border-amber-400/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-amber-400 flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-1">
                      {template.description || `${template.sport_type} scoreboard template`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(template)}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700/50 border-sky-400/30 text-sky-400 hover:bg-slate-600/50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(template.id)}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700/50 border-red-400/30 text-red-400 hover:bg-slate-600/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Default Time:</span>
                    <div className="text-white font-semibold">{formatTime(template.default_time)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Periods:</span>
                    <div className="text-white font-semibold">
                      {template.period_count} {template.period_label}s
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Timeouts:</span>
                    <div className="text-white font-semibold">
                      {template.has_timeouts ? `${template.timeouts_per_period} per period` : 'None'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Blitzes:</span>
                    <div className="text-white font-semibold">
                      {template.has_blitzes ? `${template.blitzes_per_period} per period` : 'None'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

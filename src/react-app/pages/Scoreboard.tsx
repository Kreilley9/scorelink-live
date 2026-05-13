import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import ScoreboardMobile from './ScoreboardMobile';

export default function Scoreboard() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if URL has display mode parameter
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    
    if (mode === 'large') {
      // Redirect to large display route (Gold tier only)
      navigate(`/game/${code}/large`);
    }
  }, [code, navigate]);

  // Default to mobile view
  return <ScoreboardMobile />;
}

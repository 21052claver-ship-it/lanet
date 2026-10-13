import './upload-safety.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-500.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
import '@fontsource/nunito-sans/latin-800.css';
import '@fontsource/nunito-sans/latin-900.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import App, { Boundary } from './App.jsx';
import './styles.css';
import './fidelity.css';
import './revision.css';
import './clean.css';
import './bakery.css';
import './board.css';
import './tabs.css';
import './art-polish.css';
import './google.css';
import './assessments.css';
import './welcome.css';
import './music.css';
import './banner-slots.css';
import './compatibility.css';
import './responsive.css';
import './course-grades.css';
import './course-setup.css';

function Root() {
  React.useEffect(() => {
    window.LaNetStartup?.ready();
  }, []);
  return (
    <Boundary>
      <App />
    </Boundary>
  );
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

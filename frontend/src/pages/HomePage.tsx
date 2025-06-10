import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/tasks');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <h1 className="text-4xl font-bold mb-6 text-center">Welcome to the Task Management App</h1>
      <p className="text-lg text-muted-foreground mb-8 text-center">
        Get started by creating your first task.
      </p>
      <button 
        onClick={handleGetStarted}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
};

export default HomePage;

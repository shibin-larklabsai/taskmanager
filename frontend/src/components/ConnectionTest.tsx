import { useState, useEffect } from 'react';
import { request } from '../lib/api';

const ConnectionTest = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testConnection = async () => {
    try {
      setStatus('loading');
      const response = await request({
        method: 'get',
        url: '/test-connection'
      });
      
      setStatus('success');
      setMessage(response.data?.message || 'Connection successful!');
      console.log('Backend response:', response.data);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to connect to backend');
      console.error('Connection test failed:', error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      maxWidth: '500px',
      margin: '20px auto'
    }}>
      <h2>Backend Connection Test</h2>
      <div style={{ margin: '10px 0' }}>
        <strong>Status:</strong> {status.toUpperCase()}
      </div>
      <div style={{ margin: '10px 0' }}>
        <strong>Message:</strong> {message}
      </div>
      <button 
        onClick={testConnection}
        disabled={status === 'loading'}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {status === 'loading' ? 'Testing...' : 'Test Again'}
      </button>
    </div>
  );
};

export default ConnectionTest;

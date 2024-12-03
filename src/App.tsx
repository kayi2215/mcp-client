import React from 'react';
import './App.css';
import { ChatWindow } from './components/ChatWindow';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>MCP Chat Client</h1>
      </header>
      <main>
        <ChatWindow />
      </main>
    </div>
  );
}

export default App;

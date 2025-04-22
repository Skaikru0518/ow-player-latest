import React from 'react';

const App = () => {
  const handleCloseOsr = async (e) => {
    await window.osr.toggle();
  };
  return (
    <div className="w-full h-screen bg-[#212121] text-white flex justify-center items-center mx-auto my-auto">
      <div className="bg-blue-950 flex items-center justify-center flex-col w-[850px] h-[500px] gap-8">
        <h1>Login</h1>
        <input
          type="text"
          className="w-[90%] h-12 border rounded-2xl p-6"
          placeholder="email"
        />
        <input
          type="text"
          className="w-[90%] h-12 border rounded-2xl p-6"
          placeholder="password"
        />
        <h1>ASDOIUHASUZIGDZUVAC TSFBGD</h1>
        <button onClick={handleCloseOsr}>Close osr</button>
      </div>
    </div>
  );
};

export default App;

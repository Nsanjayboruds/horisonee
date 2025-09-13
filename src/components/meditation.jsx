import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const Meditation = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 px-4 py-2 mt-4 ml-4 w-fit bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-200 transition"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>
      <div className="flex-1 flex justify-center items-center">
        <iframe
          src="http://localhost:8501/"
          title="Meditation App"
          className="w-[90%] h-[90%] rounded-xl shadow-lg border border-gray-300"
        ></iframe>
      </div>
    </div>
  );
};

export default Meditation;

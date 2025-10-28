import React from 'react';
import { videos } from '../data/mockData';

const VideoTask = ({ completeTask }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-roboto text-primary">Watch Videos</h2>
      {videos.map(video => (
        <div key={video.id} className="bg-secondary p-4 rounded shadow">
          <p className="font-roboto text-primary">{video.title}</p>
          <button
            className="bg-primary text-white px-4 py-2 rounded hover:bg-accent font-roboto"
            onClick={() => completeTask(video.reward, `Watched video: ${video.title}`)}
          >
            Watch & Review
          </button>
          <p className="text-sm text-gray-600 font-roboto">Reward: KSh {video.reward}</p>
        </div>
      ))}
    </div>
  );
};

export default VideoTask;
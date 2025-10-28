import React from 'react';
import { surveys } from '../data/mockData';

const SurveyTask = ({ completeTask }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-roboto text-primary">Surveys</h2>
      {surveys.map(survey => (
        <div key={survey.id} className="bg-secondary p-4 rounded shadow">
          <p className="font-roboto text-primary">{survey.question}</p>
          {survey.options.map(option => (
            <button
              key={option}
              className="block w-full text-left py-2 px-4 hover:bg-accent text-primary font-roboto"
              onClick={() => completeTask(survey.reward, `Completed survey: ${survey.question}`)}
            >
              {option}
            </button>
          ))}
          <p className="text-sm text-gray-600 font-roboto">Reward: KSh {survey.reward}</p>
        </div>
      ))}
    </div>
  );
};

export default SurveyTask;
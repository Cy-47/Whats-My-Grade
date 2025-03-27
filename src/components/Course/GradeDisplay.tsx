// src/components/Course/GradeDisplay.tsx
import React from "react";

interface GradeDisplayProps {
  percentage: number | null;
  letterGrade: string;
}

const GradeDisplay: React.FC<GradeDisplayProps> = ({
  percentage,
  letterGrade,
}) => {
  const displayPercentage =
    percentage !== null ? `${percentage.toFixed(2)}%` : "N/A";

  let gradeColorClass = "text-gray-700";
  if (letterGrade.startsWith("A")) gradeColorClass = "text-green-600";
  else if (letterGrade.startsWith("B")) gradeColorClass = "text-blue-600";
  else if (letterGrade.startsWith("C")) gradeColorClass = "text-yellow-600";
  else if (letterGrade.startsWith("D")) gradeColorClass = "text-orange-600";
  else if (letterGrade === "F") gradeColorClass = "text-red-600";

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg text-center border border-gray-200 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
        Overall Grade
      </h3>
      <div className="flex justify-center items-baseline gap-3">
        <span className={`text-4xl font-bold ${gradeColorClass}`}>
          {displayPercentage}
        </span>
        <span className={`text-2xl font-semibold ${gradeColorClass}`}>
          ({letterGrade})
        </span>
      </div>
      {percentage === null && (
        <p className="text-xs text-gray-500 mt-1.5">
          Calculation pending graded assignments...
        </p>
      )}
    </div>
  );
};

export default GradeDisplay;

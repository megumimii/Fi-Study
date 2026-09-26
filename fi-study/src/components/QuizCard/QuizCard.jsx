import './quiz-card.css';
import { useState } from 'react';

export default function QuizCard({
  question,
  choices,
  correctAnswer,
  explanation,
  selected, //tracks the selected answer
  onSelect,
  onSubmit,
  number
}) {

  const [revealed, setRevealed] = useState(false);
  const success = selected === correctAnswer;//if the user selected the correct answer

  function handleChoice(choice) {//choice param so that we can check what the user selected on the parent
    if (revealed) return; //already revealed dont do anything
    onSelect(choice);//callBack function, choice params so that the parent can know what the user selected
  }

  function reveal() {
    setRevealed(true);
    onSubmit();//callBack function, determine what will happen
  }

  return (
    <div className={`quiz-card ${revealed ? (success ? 'correct' : 'incorrect') : ''}`}>
      <h3 className="quiz-question">{number}. {question}</h3>

      {/*Render the choices*/}
      <div className="quiz-choices">
        {choices.map((c, i) => { //Map through the choices
          let className = ''; //Used later to style the choice button if right or wrong
          if (revealed) { //if the question is revealed (User clicked submit)
            if (c === correctAnswer) className = 'right';
            else if (c === selected) className = 'wrong';
          } else if (selected === c) {//If the selected is the same as the one clicked on the parent
            className = 'selected';
          }
          return (
            <button
              key={i}
              className={`choice-btn ${className}`}//style the button
              onClick={() => {handleChoice(c)}}//callBack, give the parent the choice through the params
            >
              {c}
            </button>
          );
        })}
      </div>

      {selected && !revealed && ( //If the user has selected an answer and the question is not revealed
        <button className="reveal-btn" onClick={()=>{reveal()}}>
          Check Answer
        </button>
      )}

      {revealed && ( //If the question is revealed
        <div className="explanation">
          <strong>{success ? '✅ CORRECT!' : '❌ INCORRECT.'}</strong>
          <p>Explanation: {explanation}</p>
        </div>
      )}
    </div>
  );
}

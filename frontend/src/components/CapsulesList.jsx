import PropTypes from "prop-types";

import Capsule from "./Capsule.jsx";

import "./CapsulesList.css";

export default function CapsulesList({ capsules }) {
  if (capsules && capsules.length === 0) {
    return (
      <p className="capsules-list-empty">
        No capsules yet. Create your first one below.
      </p>
    );
  }

  return (
    <div className="capsules-list">
      {capsules &&
        capsules.map((capsule) => (
          <Capsule key={capsule.id} capsule={capsule} />
        ))}
    </div>
  );
}

CapsulesList.propTypes = {
  capsules: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  )
};

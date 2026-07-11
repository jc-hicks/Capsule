import Capsule from "./Capsule.jsx";

export default function CapsulesList({ capsules }) {
    return (
        <div className="capsules-list">
            {capsules && capsules.map((capsule) => (
                <Capsule key={capsule.id} capsule={capsule} />
            ))}
        </div>
    );
}

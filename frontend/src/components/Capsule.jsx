export default function Capsule ({ capsule }) {
  return (
    <div className="capsule">
      <h2>{capsule.name}</h2>
      <p>{capsule.description}</p>
      <p>{capsule.members.join(", ")}</p>
    </div>
  );
}
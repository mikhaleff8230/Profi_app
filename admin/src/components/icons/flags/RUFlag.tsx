export const RUFlag = ({ width = '640px', height = '480px' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      width={width}
      height={height}
    >
      <path fill="#E53B35" d="M0 320h640v160H0z" />
      <path fill="#FFF" d="M0 0h640v160H0z.3333H0V20Z" />
      <path fill="#0C47B7" d="M0 160h640v160H0z" />
    </svg>
  );
};

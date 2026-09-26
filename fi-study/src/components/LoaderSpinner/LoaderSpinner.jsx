import './loader-spinner.css';

export default function LoaderSpinner() {
    return (
        <div className="loader-container">
            <span className='material-symbols-outlined loader'>autorenew</span>
            <p>Loading...</p>
        </div>
    );
}
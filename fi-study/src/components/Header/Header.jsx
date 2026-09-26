import { useState} from 'react';
import { useNavigate } from 'react-router-dom';
import './header.css';
import { safeText } from '../../utils/InputSanitize';

const Header = ({ userData, title, subtitle, icon }) => {

    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    return (
        <header id="header-container">
            <span className="title-subtitle-container" id="header-title-container">
                <h1 className="h1-icon">
                    <span className="material-symbols-outlined">{icon}</span>
                    <span dangerouslySetInnerHTML={{__html: safeText(title)}}/>
                </h1>
                <p>{subtitle}</p>
            </span>
            <span id="profile-picture-container">
                <img src={userData.profilePicture} style={{display: isLoading ? 'none' : `block`}} alt="Profile Picture" onClick={()=>{navigate("/main/profile")}} onLoad={()=>setIsLoading(false)} onError={(e)=>{e.target.onError = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; setIsLoading(false);}} />
                {isLoading && 
                    <div className="profile-picture-loading"></div>
                }
            </span>
        </header>
    );
};

export default Header;

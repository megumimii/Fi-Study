import './modal.css';
import { useState, useImperativeHandle, useEffect } from 'react';

export default function Modal({children, title, onClose, ref, withTitle = true, withCloseButton = true, buttonGradient='var(--button-color)', closeButtonDisabled=false}) {

    const [isOpen, setIsOpen] = useState(false);

    const openModal = () => setIsOpen(true); 
    const closeModal = () => setIsOpen(false); 

    useImperativeHandle(ref, () => ({
        openModal,
        closeModal
    }));

    return (
        <>
            {isOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            {withTitle && <h2>{title}</h2> }
                            {withCloseButton && <button className="site-button" style={{backgroundImage: buttonGradient}} onClick={onClose} disabled={closeButtonDisabled}><span className="material-symbols-outlined">close</span></button> }
                        </div>
                        <div className="modal-body">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    )

}
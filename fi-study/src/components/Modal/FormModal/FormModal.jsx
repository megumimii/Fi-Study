import React, { useRef } from 'react';
import Modal from '../Modal';
import './form-modal.css';

const FormModal = ({
    header,
    title,
    icon,
    subtitle,
    children,
    buttonName,
    buttonCallback,
    disabled = false,
    onClose,
    buttonRef,
    ref,
    buttonGradient = 'var(--button-color)',
    closeDisabled=false
}) => {
    return (
        <Modal ref={ref} title={header} onClose={onClose} closeButtonDisabled={closeDisabled}>
            <div className="form-modal-content">
                <span className="form-modal-title-container">
                    <h3 className='form-modal-h1-icon'>
                        {icon && <span className="material-symbols-outlined">{icon}</span>}
                        {title}
                    </h3>
                    {subtitle && <p>{subtitle}</p>}
                </span>

                <div className="form-modal-body">
                    {children}
                </div>

                <button
                    className="form-modal-button site-button"
                    onClick={buttonCallback}
                    disabled={disabled}
                    ref={buttonRef}
                    style={{ background: buttonGradient }}
                >
                    {buttonName}
                </button>
            </div>
        </Modal>
    );
};

export default FormModal;

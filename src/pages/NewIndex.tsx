import { useState, useRef, useEffect } from 'react';
import { analyzeImage } from '@/lib/api';
import './../custom-ui.css'; // Import the custom styles
import { DiagnosisResult } from '@/lib/types';

interface ClinicalForm {
    doctorName: string;
    hospitalName: string;
    patientName: string;
    patientId: string;
    age: string;
    gender: string;
    lesionSite: string;
    habits: string[];
    notes: string;
}

export default function NewIndex() {
    const [form, setForm] = useState<ClinicalForm>({
        doctorName: '',
        hospitalName: '',
        patientName: '',
        patientId: '',
        age: '',
        gender: '',
        lesionSite: '',
        habits: [],
        notes: '',
    });

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
    const [gradCamImage, setGradCamImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = items[i].getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            setSelectedImage(reader.result as string);
                            setSelectedFile(file);
                        };
                        reader.readAsDataURL(file);
                        return;
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const toggleHabit = (habit: string) => {
        setForm(prev => {
            const habits = prev.habits.includes(habit)
                ? prev.habits.filter(h => h !== habit)
                : [...prev.habits, habit];
            return { ...prev, habits };
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = () => setSelectedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) {
            alert("Please upload an oral lesion image before analyzing.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const { diagnosis: result, gradCamImage: cam } = await analyzeImage(selectedFile);
            setDiagnosis(result);
            setGradCamImage(cam || null);
        } catch (error) {
            console.error(error);
            alert("Error during analysis. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const resetForm = () => {
        setForm({
            doctorName: '',
            hospitalName: '',
            patientName: '',
            patientId: '',
            age: '',
            gender: '',
            lesionSite: '',
            habits: [],
            notes: '',
        });
        setSelectedImage(null);
        setSelectedFile(null);
        setDiagnosis(null);
        setGradCamImage(null);
    };

    const renderResultBlock = (key: string, label: string, leftLabel: string, rightLabel: string, leftVal: number, rightVal: number) => {
        const leftWin = leftVal > rightVal;
        const winner = leftWin ? leftLabel : rightLabel;
        const confidence = leftWin ? leftVal : rightVal;
        const isLeftSerious = ['Abnormal', 'Cancer', 'Malignant'].includes(leftLabel);
        const isRightSerious = ['Abnormal', 'Cancer', 'Malignant'].includes(rightLabel);

        return (
            <div className="result-block" key={key}>
                <div className="result-header">
                    <span>{label}</span>
                    <span className={`badge-pill ${['Abnormal', 'Cancer', 'Malignant'].includes(winner) ? 'badge-high' : 'badge-normal'}`}>
                        {winner} ({confidence.toFixed(1)}%)
                    </span>
                </div>
                <div className="result-probs" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${leftVal}%`, background: isLeftSerious ? '#f87171' : '#60a5fa', height: '100%' }}></div>
                        <div style={{ width: `${rightVal}%`, background: isRightSerious ? '#f87171' : '#94a3b8', height: '100%', opacity: 0.8 }}></div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', fontSize: '9px', opacity: 0.5, marginTop: '2px' }}>
                    <div style={{ flex: 1 }}>{leftLabel}</div>
                    <div style={{ textAlign: 'right' }}>{rightLabel}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-shell">
            <div className="container">
                <header className="header">
                    <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '12px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/logo.png" alt="O_Dtect Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="title-badge">O_Dtect | Advanced Oral AI</div>
                    </div>
                    <div className="title-block">
                        <h1>O_Dtect Diagnostic Dashboard</h1>
                        <p>Upload an intraoral image and receive multi-stage risk predictions with Grad-CAM heatmaps to support clinical decisions.</p>
                    </div>
                    <div>
                        <div className="status-pill">O_Dtect Ultimate Model Ready</div>
                    </div>
                </header>

                <div className="grid">
                    <div className="card">
                        <div className="card-inner">
                            <h2><span className="icon">AI</span>Doctor & Patient Details</h2>
                            <p className="card-subtitle">Enter clinical details and upload an oral lesion image for AI-assisted triage.</p>

                            <form id="analysis-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="doctorName">Doctor Name</label>
                                        <input type="text" id="doctorName" name="doctorName" placeholder="Dr. John Doe" value={form.doctorName} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="hospitalName">Hospital / Clinic</label>
                                        <input type="text" id="hospitalName" name="hospitalName" placeholder="XYZ Dental Hospital" value={form.hospitalName} onChange={handleInputChange} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="patientName">Patient Name</label>
                                        <input type="text" id="patientName" name="patientName" placeholder="Patient full name" value={form.patientName} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="patientId">Patient ID / Case ID</label>
                                        <input type="text" id="patientId" name="patientId" placeholder="e.g., OPD-2025-0012" value={form.patientId} onChange={handleInputChange} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="age">Age</label>
                                        <input type="number" id="age" name="age" min="0" max="120" placeholder="e.g., 45" value={form.age} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="gender">Gender</label>
                                        <select id="gender" name="gender" value={form.gender} onChange={handleInputChange}>
                                            <option value="">Select</option>
                                            <option>Male</option>
                                            <option>Female</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="lesionSite">Lesion Site</label>
                                        <input type="text" id="lesionSite" name="lesionSite" placeholder="e.g., Lateral border of tongue" value={form.lesionSite} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group">
                                        <label>Habit History</label>
                                        <div className="pill-row">
                                            {['Tobacco', 'Areca nut', 'Alcohol', 'None'].map(habit => (
                                                <span
                                                    key={habit}
                                                    className={`pill ${form.habits.includes(habit) ? 'active' : ''}`}
                                                    onClick={() => toggleHabit(habit)}
                                                >
                                                    {habit}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="notes">Clinical Notes</label>
                                    <textarea id="notes" name="notes" placeholder="Brief description of lesion appearance..." value={form.notes} onChange={handleInputChange}></textarea>
                                </div>

                                <div className="form-group">
                                    <label>Upload Oral Lesion Image</label>
                                    <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
                                        <div className="upload-icon">Upload</div>
                                        <div className="upload-text-main">Click to upload or drag & drop</div>
                                        <div className="upload-text-sub">Supported formats: JPG, JPEG, PNG</div>
                                        <input type="file" ref={fileInputRef} hidden onChange={handleImageUpload} accept="image/*" />
                                    </div>
                                </div>

                                {selectedImage && (
                                    <div className="preview-container">
                                        <img src={selectedImage} alt="Preview" />
                                    </div>
                                )}

                                <div className="btn-row">
                                    <button type="button" className="btn btn-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
                                    </button>
                                    <button type="button" className="btn btn-outline" onClick={resetForm}>Clear Form</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-inner">
                            <h2><span className="icon">CAM</span>AI Analysis & Grad-CAM</h2>

                            {!diagnosis && !isAnalyzing && (
                                <div className="helper-text">Predictions and Grad-CAM heatmaps will appear here after analysis.</div>
                            )}

                            {diagnosis && (
                                <div className="results-section">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4" style={{ color: '#60a5fa', fontSize: '11px' }}>Categorical Breakdown</h3>
                                    <div className="space-y-3 mb-6">
                                        {diagnosis.differentialDiagnosis.map((item, idx) => (
                                            <div key={idx} className="result-block" style={{ borderLeft: '3px solid ' + (idx === 0 ? '#3b82f6' : 'rgba(255,255,255,0.1)') }}>
                                                <div className="result-header">
                                                    <span>{item.condition}</span>
                                                    <span className={`badge-pill ${idx === 0 ? 'badge-high' : 'badge-normal'}`}>
                                                        {(item.probability * 100).toFixed(1)}% Match
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4" style={{ color: '#60a5fa', fontSize: '11px' }}>Clinical Triage Metrics</h3>
                                    {renderResultBlock('n_a', 'Abnormal vs Normal', 'Abnormal', 'Normal', diagnosis.normalVsAbnormal.abnormal, diagnosis.normalVsAbnormal.normal)}

                                    {diagnosis.normalVsAbnormal.abnormal > 15 && (
                                        <>
                                            {renderResultBlock('b_m', 'Malignant vs Benign', 'Malignant', 'Benign', diagnosis.benignVsMalignant.malignant, diagnosis.benignVsMalignant.benign)}
                                            {!(diagnosis.predictedClass === 'Normal' || diagnosis.predictedClass === 'Benign') && (
                                                renderResultBlock('c_p', 'Cancer vs Pre-Cancer', 'Cancer', 'Pre-Cancer', diagnosis.precancerVsCancer.cancer, diagnosis.precancerVsCancer.precancer)
                                            )}
                                        </>
                                    )}

                                    {gradCamImage && (
                                        <div className="heatmap-box">
                                            <img src={gradCamImage} alt="Heatmap" />
                                        </div>
                                    )}

                                    <div className="btn-row">
                                        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.print()}>Save Report as PDF</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

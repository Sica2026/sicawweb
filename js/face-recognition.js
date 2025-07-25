// ======================================
// FACE RECOGNITION SYSTEM
// ======================================

class FacialRecognition {
    constructor() {
        this.isRecognizing = false;
        this.recognitionCallback = null;
        this.recognitionInterval = null;
        this.db = firebase.firestore();
        this.faceDescriptors = new Map(); // Cache for face descriptors
        this.canvas = null;
        this.context = null;
        
        this.init();
    }

    async init() {
        // Create hidden canvas for processing
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        
        // Load face descriptors from database
        await this.loadFaceDescriptors();
        
        console.log('👤 Sistema de reconocimiento facial inicializado');
    }

    async loadFaceDescriptors() {
        try {
            console.log('📊 Cargando descriptores faciales...');
            
            const snapshot = await this.db.collection('asesores')
                .where('faceData', '!=', null)
                .get();

            this.faceDescriptors.clear();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.faceData && data.numeroCuenta) {
                    // Use numeroCuenta as key instead of document ID
                    this.faceDescriptors.set(data.numeroCuenta, data.faceData);
                }
            });

            console.log(`✅ Cargados ${this.faceDescriptors.size} descriptores faciales`);
        } catch (error) {
            console.error('❌ Error cargando descriptores faciales:', error);
        }
    }

    startRecognition(videoElement, callback) {
        if (this.isRecognizing) {
            console.warn('⚠️ El reconocimiento ya está activo');
            return;
        }

        this.isRecognizing = true;
        this.recognitionCallback = callback;

        console.log('🎥 Iniciando reconocimiento facial...');

        // Start recognition loop
        this.recognitionInterval = setInterval(() => {
            this.processFrame(videoElement);
        }, 1000); // Process every second to avoid overload
    }

    stopRecognition() {
        if (!this.isRecognizing) return;

        this.isRecognizing = false;
        this.recognitionCallback = null;

        if (this.recognitionInterval) {
            clearInterval(this.recognitionInterval);
            this.recognitionInterval = null;
        }

        console.log('⏹️ Reconocimiento facial detenido');
    }

    async processFrame(videoElement) {
        if (!this.isRecognizing || !videoElement.videoWidth || !videoElement.videoHeight) {
            return;
        }

        try {
            // Set canvas size to match video
            this.canvas.width = videoElement.videoWidth;
            this.canvas.height = videoElement.videoHeight;

            // Draw video frame to canvas
            this.context.drawImage(videoElement, 0, 0);

            // Extract face data from current frame
            const currentFaceData = await this.extractFaceDataFromCanvas(this.canvas);
            
            if (!currentFaceData) {
                return; // No face detected
            }

            // Compare with stored descriptors
            const match = this.findBestMatch(currentFaceData);
            
            if (match && match.confidence > 0.7) {
                // Call the callback with the match result
                if (this.recognitionCallback) {
                    this.recognitionCallback({
                        numeroCuenta: match.numeroCuenta,
                        confidence: match.confidence,
                        timestamp: new Date()
                    });
                }
            }

        } catch (error) {
            console.error('Error processing frame:', error);
        }
    }

    async extractFaceDataFromCanvas(canvas) {
        try {
            // Simple face detection simulation
            // In a real implementation, you would use libraries like face-api.js or TensorFlow.js
            
            const imageData = this.context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Simulate face detection (this is a placeholder)
            const faceDetected = this.simulateFaceDetection(imageData);
            
            if (!faceDetected) {
                return null;
            }

            // Simulate feature extraction (this would be actual face encoding in production)
            const faceDescriptor = this.simulateFeatureExtraction(imageData);
            
            return faceDescriptor;

        } catch (error) {
            console.error('Error extracting face data:', error);
            return null;
        }
    }

    simulateFaceDetection(imageData) {
        // Placeholder for face detection
        // In production, this would use actual computer vision algorithms
        
        const data = imageData.data;
        let facePixels = 0;
        let totalPixels = data.length / 4;
        
        // Simple skin tone detection as face proxy
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simple skin tone detection
            if (r > 95 && g > 40 && b > 20 && 
                Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                Math.abs(r - g) > 15 && r > g && r > b) {
                facePixels++;
            }
        }
        
        // If more than 2% of pixels look like skin, assume face is present
        return (facePixels / totalPixels) > 0.02;
    }

    simulateFeatureExtraction(imageData) {
        // Placeholder for feature extraction
        // In production, this would use neural networks to create face encodings
        
        const data = imageData.data;
        const features = [];
        
        // Create a simple hash based on image characteristics
        // This is NOT a real face descriptor - just for demonstration
        for (let i = 0; i < 128; i++) {
            let sum = 0;
            const start = Math.floor((i / 128) * data.length);
            const end = Math.min(start + 1000, data.length);
            
            for (let j = start; j < end; j += 4) {
                sum += data[j] + data[j + 1] + data[j + 2];
            }
            
            features.push(sum / ((end - start) / 4));
        }
        
        return features;
    }

    findBestMatch(currentFaceData) {
        if (!currentFaceData || this.faceDescriptors.size === 0) {
            return null;
        }

        let bestMatch = null;
        let bestConfidence = 0;

        // Compare with all stored descriptors
        for (const [numeroCuenta, storedDescriptor] of this.faceDescriptors.entries()) {
            const similarity = this.calculateSimilarity(currentFaceData, storedDescriptor);
            
            if (similarity > bestConfidence && similarity > 0.6) {
                bestConfidence = similarity;
                bestMatch = {
                    numeroCuenta: numeroCuenta,
                    confidence: similarity
                };
            }
        }

        return bestMatch;
    }

    calculateSimilarity(descriptor1, descriptor2) {
        if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
            return 0;
        }

        // Calculate cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < descriptor1.length; i++) {
            dotProduct += descriptor1[i] * descriptor2[i];
            norm1 += descriptor1[i] * descriptor1[i];
            norm2 += descriptor2[i] * descriptor2[i];
        }

        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }

        const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        
        // Normalize to 0-1 range
        return Math.max(0, Math.min(1, (similarity + 1) / 2));
    }

    async extractFaceData(canvas) {
        // Public method for extracting face data from captured images
        return await this.extractFaceDataFromCanvas(canvas);
    }

    async updateFaceDescriptor(numeroCuenta, faceData) {
        try {
            // Update local cache
            this.faceDescriptors.set(numeroCuenta, faceData);
            
            console.log(`✅ Descriptor facial actualizado para: ${numeroCuenta}`);
        } catch (error) {
            console.error('Error updating face descriptor:', error);
            throw error;
        }
    }

    // Method to get recognition statistics
    getStats() {
        return {
            isActive: this.isRecognizing,
            descriptorsLoaded: this.faceDescriptors.size,
            lastUpdate: new Date().toISOString()
        };
    }

    // Method to manually trigger descriptor reload
    async reloadDescriptors() {
        await this.loadFaceDescriptors();
    }
}

// Initialize facial recognition system
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we have the necessary APIs
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        window.FacialRecognition = new FacialRecognition();
    } else {
        console.warn('⚠️ Sistema de reconocimiento facial no disponible - APIs no soportadas');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.FacialRecognition) {
        window.FacialRecognition.stopRecognition();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacialRecognition;
}
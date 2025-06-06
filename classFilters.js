// List of recurring or generic class types to suppress notifications for.
// These classes will still be stored in the database, but users won't receive notifications about them.
// To ignore notifications for a new class, add its name to this array.
const recurringClasses = [
    { className: 'AZUL'},
    { className: 'CINZA'},
    { className: 'ERASMUS'},
    { className: 'BEGINNERS ADULTS'},
    { className: 'PRIVADA'},
    { className: 'SURF ADAPTADO'},
    { className: 'GRUPO'},
    { className: 'ONDA SOCIAL'},
    { className: 'TREINO FÍSICO GROMS - FIT2SURF'},
    // Add more class names here to suppress their notifications
];

// Keywords identifying performance classes.
// Use these keywords to easily filter or handle performance classes elsewhere in the app.
const performanceClassKeywords = [
    'PERFORMANCE LARANJA',
    'PERFORMANCE VERMELHO',
    'PERFORMANCE ALL LEVELS',
    'SURF SAFARI PERFORMANCE'
];

export { recurringClasses, performanceClassKeywords };

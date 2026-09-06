export const visualCues = {
  // Textos que DEBEN aparecer para considerar el documento auténtico de este tipo
  requiredKeywords: [
    "BOARD OF INTERMEDIATE AND SECONDARY EDUCATION",
    "BANGLADESH"
  ],

  // Textos que nos ayudan a identificar si es Diploma o Transcript
  documentTypes: {
    diploma: [
      "HIGHER SECONDARY CERTIFICATE EXAMINATION",
      "This is to certify that",
      "duly passed the",
      "securing GPA"
    ],
    transcript: [
      "ACADEMIC TRANSCRIPT",
      "Name of Subjects",
      "Letter Grade",
      "Grade Point",
      "Registration No.",
      "Type of Student"
    ]
  },

  // Patrones de Regex para extraer datos clave rápidamente sin usar IA costosa
  patterns: {
    // Busca: "GPA 5.00", "GPA 3.50", "G.P.A 4.00"
    gpa: /(?:GPA|G\.P\.A\.?)\s*:?\s*([0-5]\.\d{2})/i,
    
    // Busca el Registration No que suele ser largo, ej: 1810481379, puede tener sesión
    registrationNo: /(?:Registration\s*No\.?)\s*[:\-\s]*(\d{8,15}(?:\/\d{4}-\d{2,4})?)/i,

    // Busca el Roll No, ej: 102510 o 11 05 66
    rollNo: /(?:Roll\s*No\.?)\s*[:\-\s]*(\d[\d\s]+\d)/i,

    // Busca el año de sesión, ej: 2021-2022 o 2021-22
    session: /(?:Session)\s*[:\-\s]*(\d{4}-\d{2,4})/i
  }
};

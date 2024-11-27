const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); 
const app = express();


app.use(cors());
app.use(express.json())


app.use(express.static('uploads'));

const upload = multer({ dest: 'uploads/' }); // Pasta temporária para armazenar o upload

// Função para enviar a imagem para o servidor handy.org
const sendToHandy = (filePath, fileName, res) => {
  const formData = new FormData();
  formData.append('img', fs.createReadStream(filePath), fileName);

  axios.post('https://handy.org/Public/iCandy/candys.php?query=upload', formData, {
    headers: formData.getHeaders(),
    onUploadProgress: (progressEvent) => {
      const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      console.log(`Progresso de upload: ${progress}%`);
    }
  })
    .then((response) => {
      console.log('Resposta do servidor handy.org:', response.data);
      res.json({ message: 'Imagem enviada com sucesso!', data: response.data });
    })
    .catch((error) => {
      console.error('Erro ao enviar a imagem para handy.org:', error);
      res.status(500).json({ error: 'Falha ao enviar a imagem para handy.org' });
    });
};

// Função para converter a imagem para o formato WebP
const convertImageToWebp = (inputPath, outputPath, callback) => {
  ffmpeg(inputPath)
    .output(outputPath)
    .outputOptions([
      '-c:v libwebp',   // Codec para WebP
      '-qscale 80'      // Qualidade (ajuste entre 0 e 100, sendo 100 a máxima qualidade)
    ])
    .on('end', () => {
      console.log(`Imagem convertida para WEBP: ${outputPath}`);
      callback(null, outputPath);
    })
    .on('error', (err) => {
      console.error('Erro ao converter imagem:', err);
      callback(err);
    })
    .run();
};

// Endpoint para upload e processamento da imagem
app.post('/coni', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
  }

  const inputImage = req.file.path; // Caminho do arquivo recebido
  const outputImage = path.join('uploads', `${req.file.filename}.webp`); // Caminho da imagem convertida

  // Converter imagem para WebP
  convertImageToWebp(inputImage, outputImage, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Falha ao converter a imagem para WebP.' });
    }

    // Enviar a imagem convertida para o servidor handy.org
    sendToHandy(outputImage, `${req.file.filename}.webp`, res);

    // Opcional: Remover arquivos temporários após o envio
    fs.unlink(inputImage, (unlinkErr) => {
      if (unlinkErr) console.error('Erro ao remover arquivo temporário de upload:', unlinkErr);
    });
    fs.unlink(outputImage, (unlinkErr) => {
      if (unlinkErr) console.error('Erro ao remover arquivo temporário convertido:', unlinkErr);
    });
  });
});

// Inicializar o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

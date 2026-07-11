import express from 'express';
import capsuleRoutes from './routes/Capsule.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', capsuleRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
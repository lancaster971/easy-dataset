import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Popular fine-tuning models on Together AI
const TOGETHER_MODELS = [
  { group: 'DeepSeek', models: [
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', name: 'DeepSeek-R1-Distill-Llama-70B' },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B', name: 'DeepSeek-R1-Distill-Qwen-14B' },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B', name: 'DeepSeek-R1-Distill-Qwen-1.5B' },
  ]},
  { group: 'Llama 4', models: [
    { id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', name: 'Llama-4-Scout-17B-16E-Instruct' },
    { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct', name: 'Llama-4-Maverick-17B-128E-Instruct' },
  ]},
  { group: 'Llama 3.3', models: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Reference', name: 'Llama-3.3-70B-Instruct-Reference' },
  ]},
  { group: 'Llama 3.1', models: [
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference', name: 'Llama-3.1-8B-Instruct-Reference' },
    { id: 'meta-llama/Meta-Llama-3.1-70B-Reference', name: 'Llama-3.1-70B-Reference' },
  ]},
  { group: 'Qwen 3', models: [
    { id: 'Qwen/Qwen3-0.6B', name: 'Qwen3-0.6B' },
    { id: 'Qwen/Qwen3-1.7B', name: 'Qwen3-1.7B' },
    { id: 'Qwen/Qwen3-4B', name: 'Qwen3-4B' },
    { id: 'Qwen/Qwen3-8B', name: 'Qwen3-8B' },
    { id: 'Qwen/Qwen3-14B', name: 'Qwen3-14B' },
    { id: 'Qwen/Qwen3-32B', name: 'Qwen3-32B' },
    { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen3-235B-A22B' },
  ]},
  { group: 'Qwen 2.5', models: [
    { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B-Instruct' },
    { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen2.5-14B-Instruct' },
    { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5-32B-Instruct' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B-Instruct' },
  ]},
  { group: 'Gemma 3', models: [
    { id: 'google/gemma-3-4b-it', name: 'Gemma-3-4B-IT' },
    { id: 'google/gemma-3-12b-it', name: 'Gemma-3-12B-IT' },
    { id: 'google/gemma-3-27b-it', name: 'Gemma-3-27B-IT' },
  ]},
  { group: 'Mistral', models: [
    { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral-8x7B-Instruct' },
    { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral-7B-Instruct-v0.2' },
  ]},
  { group: 'Kimi (Moonshot)', models: [
    { id: 'moonshotai/Kimi-K2-Instruct', name: 'Kimi-K2-Instruct' },
  ]},
  { group: 'OpenAI OSS', models: [
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS-20B' },
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS-120B' },
  ]},
  { group: 'GLM', models: [
    { id: 'zai-org/GLM-4.7', name: 'GLM-4.7' },
  ]},
];

const STATUS_COLORS = {
  'pending': 'warning',
  'queued': 'warning',
  'running': 'info',
  'completed': 'success',
  'failed': 'error',
  'cancelled': 'default',
  'cancel_requested': 'default',
};

const TogetherAITab = ({
  projectId,
  systemPrompt,
  confirmedOnly,
  includeCOT,
  handleSystemPromptChange,
  handleConfirmedOnlyChange,
  handleIncludeCOTChange
}) => {
  const { t } = useTranslation();

  // State
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Fine-tune config
  const [selectedModel, setSelectedModel] = useState('meta-llama/Meta-Llama-3.1-8B-Instruct-Reference');
  const [customModelId, setCustomModelId] = useState('');
  const [nEpochs, setNEpochs] = useState(3);
  const [learningRate, setLearningRate] = useState(0.00001);
  const [batchSize, setBatchSize] = useState(8);
  const [suffix, setSuffix] = useState('');
  const [loraRank, setLoraRank] = useState(16);
  const [loraAlpha, setLoraAlpha] = useState(16);
  const [loraDropout, setLoraDropout] = useState(0.05);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fine-tune job state
  const [creatingJob, setCreatingJob] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load API key from project config
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      fetch(`/api/projects/${projectId}/config`)
        .then(res => res.json())
        .then(data => {
          if (data.togetherApiKey) {
            setApiKey(data.togetherApiKey);
            setHasApiKey(true);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load Together AI API Key:', err);
          setLoading(false);
        });
    }
  }, [projectId]);

  // Step 1: Upload dataset
  const handleUpload = async () => {
    if (!hasApiKey) return;

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/projects/${projectId}/together/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          systemPrompt,
          confirmedOnly,
          includeCOT
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setUploadedFile(data.file);
      setSuccess(t('together.uploadSuccess', { count: data.file.lineCount }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Step 2: Create fine-tune job
  const handleCreateFineTune = async () => {
    if (!uploadedFile) return;

    const modelToUse = selectedModel === '__custom__' ? customModelId : selectedModel;
    if (!modelToUse) {
      setError(t('together.selectModel'));
      return;
    }

    try {
      setCreatingJob(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/projects/${projectId}/together/fine-tune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          fileId: uploadedFile.id,
          model: modelToUse,
          nEpochs,
          learningRate,
          batchSize,
          suffix: suffix || undefined,
          loraRank,
          loraAlpha,
          loraDropout
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create job');

      setCurrentJob(data.job);
      setSuccess(t('together.jobCreated', { id: data.job.id }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingJob(false);
    }
  };

  // Refresh job status
  const refreshJobStatus = useCallback(async (jobId) => {
    if (!jobId || !apiKey) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/together/fine-tune/${jobId}?apiKey=${encodeURIComponent(apiKey)}`
      );
      const data = await response.json();
      if (response.ok) {
        setCurrentJob(data.job);
      }
    } catch (err) {
      console.error('Failed to refresh job status:', err);
    }
  }, [projectId, apiKey]);

  // Cancel job
  const handleCancelJob = async (jobId) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/together/fine-tune/${jobId}?apiKey=${encodeURIComponent(apiKey)}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setSuccess(t('together.jobCancelled'));
        refreshJobStatus(jobId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Load existing jobs
  const loadJobs = async () => {
    if (!apiKey) return;

    try {
      setLoadingJobs(true);
      const response = await fetch(
        `/api/projects/${projectId}/together/fine-tune?apiKey=${encodeURIComponent(apiKey)}`
      );
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Auto-refresh current job
  useEffect(() => {
    if (!currentJob || !['pending', 'queued', 'running'].includes(currentJob.status)) return;

    const interval = setInterval(() => {
      refreshJobStatus(currentJob.id);
    }, 15000); // every 15 seconds

    return () => clearInterval(interval);
  }, [currentJob, refreshJobStatus]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleOutlineIcon fontSize="inherit" />} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* No API Key Warning */}
      {!hasApiKey && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('together.noApiKeyWarning')}
          <Box mt={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => (window.location.href = `/projects/${projectId}/settings`)}
            >
              {t('export.goToSettings')}
            </Button>
          </Box>
        </Alert>
      )}

      {/* STEP 1: Upload Dataset */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('together.step1Title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t('together.step1Description')}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('export.systemPrompt')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={systemPrompt}
            onChange={handleSystemPromptChange}
            variant="outlined"
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'row', gap: 4 }}>
          <FormControlLabel
            control={<Checkbox checked={confirmedOnly} onChange={handleConfirmedOnlyChange} size="small" />}
            label={t('export.onlyConfirmed')}
          />
          <FormControlLabel
            control={<Checkbox checked={includeCOT} onChange={handleIncludeCOTChange} size="small" />}
            label={t('export.includeCOT')}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || !hasApiKey}
            startIcon={uploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
            sx={{ borderRadius: 2 }}
          >
            {uploading ? t('together.uploading') : t('together.uploadDataset')}
          </Button>
          {uploadedFile && (
            <Chip
              label={`${uploadedFile.filename} (${uploadedFile.lineCount} samples)`}
              color="success"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      </Paper>

      {/* STEP 2: Configure & Launch Fine-tuning */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, opacity: uploadedFile ? 1 : 0.5 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('together.step2Title')}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('together.model')}</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label={t('together.model')}
                disabled={!uploadedFile}
              >
                {TOGETHER_MODELS.map(group => [
                  <MenuItem key={`group-${group.group}`} disabled sx={{ fontWeight: 'bold', opacity: 1, fontSize: '0.85rem' }}>
                    {group.group}
                  </MenuItem>,
                  ...group.models.map(m => (
                    <MenuItem key={m.id} value={m.id} sx={{ pl: 4 }}>
                      {m.name}
                    </MenuItem>
                  ))
                ])}
                <Divider />
                <MenuItem value="__custom__" sx={{ fontStyle: 'italic' }}>
                  {t('together.customModel')}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {selectedModel === '__custom__' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label={t('together.customModelId')}
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="org/model-name"
                helperText={t('together.customModelHelp')}
              />
            </Grid>
          )}

          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('together.epochs')}
              value={nEpochs}
              onChange={(e) => setNEpochs(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: 20 }}
              disabled={!uploadedFile}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('together.learningRate')}
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value) || 0.00001)}
              inputProps={{ step: 0.000001, min: 0.000001, max: 0.01 }}
              disabled={!uploadedFile}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('together.batchSize')}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(parseInt(e.target.value) || 8, 8))}
              inputProps={{ min: 8, max: 128 }}
              disabled={!uploadedFile}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label={t('together.suffix')}
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="my-custom-model"
              helperText={t('together.suffixHelp')}
              disabled={!uploadedFile}
            />
          </Grid>
        </Grid>

        {/* Advanced LoRA settings */}
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced)}
            endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {t('together.advancedSettings')}
          </Button>
          <Collapse in={showAdvanced}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="LoRA Rank"
                  value={loraRank}
                  onChange={(e) => setLoraRank(parseInt(e.target.value) || 8)}
                  inputProps={{ min: 4, max: 128 }}
                  disabled={!uploadedFile}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="LoRA Alpha"
                  value={loraAlpha}
                  onChange={(e) => setLoraAlpha(parseInt(e.target.value) || 8)}
                  inputProps={{ min: 4, max: 128 }}
                  disabled={!uploadedFile}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="LoRA Dropout"
                  value={loraDropout}
                  onChange={(e) => setLoraDropout(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.01, min: 0, max: 0.5 }}
                  disabled={!uploadedFile}
                />
              </Grid>
            </Grid>
          </Collapse>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleCreateFineTune}
            disabled={!uploadedFile || creatingJob}
            startIcon={creatingJob ? <CircularProgress size={18} /> : <RocketLaunchIcon />}
            sx={{ borderRadius: 2 }}
          >
            {creatingJob ? t('together.creating') : t('together.startFineTuning')}
          </Button>
        </Box>
      </Paper>

      {/* STEP 3: Monitor Job */}
      {currentJob && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {t('together.step3Title')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={t('together.refresh')}>
                <IconButton size="small" onClick={() => refreshJobStatus(currentJob.id)}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {['pending', 'queued', 'running'].includes(currentJob.status) && (
                <Tooltip title={t('together.cancel')}>
                  <IconButton size="small" color="error" onClick={() => handleCancelJob(currentJob.id)}>
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Job ID</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{currentJob.id}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">{t('together.status')}</Typography>
              <Chip
                label={currentJob.status}
                color={STATUS_COLORS[currentJob.status] || 'default'}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">{t('together.model')}</Typography>
              <Typography variant="body2">{currentJob.model}</Typography>
            </Grid>
            {currentJob.outputName && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">{t('together.outputModel')}</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {currentJob.outputName}
                </Typography>
              </Grid>
            )}
          </Grid>

          {['pending', 'queued', 'running'].includes(currentJob.status) && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {t('together.autoRefresh')}
              </Typography>
            </Box>
          )}

          {currentJob.status === 'completed' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {t('together.jobCompleted', { model: currentJob.outputName || currentJob.id })}
            </Alert>
          )}

          {currentJob.status === 'failed' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('together.jobFailed')}
            </Alert>
          )}
        </Paper>
      )}

      {/* Previous Jobs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('together.previousJobs')}
        </Typography>
        <Button
          size="small"
          onClick={loadJobs}
          disabled={!hasApiKey || loadingJobs}
          startIcon={loadingJobs ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
        >
          {t('together.loadJobs')}
        </Button>
      </Box>

      {jobs.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1 }}>
          {jobs.slice(0, 10).map((job) => (
            <Box key={job.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Chip
                label={job.status}
                color={STATUS_COLORS[job.status] || 'default'}
                size="small"
                sx={{ minWidth: 80 }}
              />
              <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }} noWrap>
                {job.model}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {job.id?.slice(0, 12)}...
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setCurrentJob(job);
                  refreshJobStatus(job.id);
                }}
              >
                {t('together.viewDetails')}
              </Button>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default TogetherAITab;

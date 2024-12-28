// src/components/workshop/steps/DetailModal.js

import React from 'react';
import { Modal, Box, Typography } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const DetailModal = ({ open, handleClose, nodeData }) => (
  <Modal
    open={open}
    onClose={handleClose}
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <Box sx={style}>
      <Typography id="modal-title" variant="h6" component="h2">
        {nodeData?.label || 'No Title'}
      </Typography>
      <Typography id="modal-description" sx={{ mt: 2 }}>
        {nodeData?.description || 'No additional information available.'}
      </Typography>
    </Box>
  </Modal>
);

export default DetailModal;
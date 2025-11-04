import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [season, setSeason] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load user from localStorage (no authentication)
      const savedUser = localStorage.getItem('selectedUser');
      if (savedUser) {
        setUser(savedUser);
      }

      // Load institutions
      const institutionsResponse = await api.get('/institutions');
      setInstitutions(institutionsResponse.data);

      // Load selected institution from localStorage or use first
      const savedInstitutionId = localStorage.getItem('selectedInstitution');
      let selectedInstitution = null;

      if (savedInstitutionId) {
        selectedInstitution = institutionsResponse.data.find(
          (inst) => inst._id === savedInstitutionId
        );
      }

      if (!selectedInstitution && institutionsResponse.data.length > 0) {
        selectedInstitution = institutionsResponse.data[0];
      }

      if (selectedInstitution) {
        setInstitution(selectedInstitution);
        localStorage.setItem('selectedInstitution', selectedInstitution._id);

        // Load seasons for selected institution
        const seasonsResponse = await api.get(
          `/seasons?institution=${selectedInstitution._id}`
        );
        setSeasons(seasonsResponse.data);

        // Load selected season from localStorage or use active season
        const savedSeasonId = localStorage.getItem('selectedSeason');
        let selectedSeason = null;

        if (savedSeasonId) {
          selectedSeason = seasonsResponse.data.find(
            (s) => s._id === savedSeasonId
          );
        }

        if (!selectedSeason) {
          selectedSeason = seasonsResponse.data.find((s) => s.isActive);
        }

        if (!selectedSeason && seasonsResponse.data.length > 0) {
          selectedSeason = seasonsResponse.data[0];
        }

        if (selectedSeason) {
          setSeason(selectedSeason);
          localStorage.setItem('selectedSeason', selectedSeason._id);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeInstitution = async (institutionId) => {
    try {
      const selectedInstitution = institutions.find((i) => i._id === institutionId);
      if (selectedInstitution) {
        setInstitution(selectedInstitution);
        localStorage.setItem('selectedInstitution', institutionId);

        // Load seasons for new institution
        const seasonsResponse = await api.get(`/seasons?institution=${institutionId}`);
        setSeasons(seasonsResponse.data);

        // Select active season or first season
        const activeSeason = seasonsResponse.data.find((s) => s.isActive);
        const selectedSeason = activeSeason || seasonsResponse.data[0];

        if (selectedSeason) {
          setSeason(selectedSeason);
          localStorage.setItem('selectedSeason', selectedSeason._id);
        } else {
          setSeason(null);
          localStorage.removeItem('selectedSeason');
        }
      }
    } catch (error) {
      console.error('Error changing institution:', error);
    }
  };

  const changeSeason = (seasonId) => {
    const selectedSeason = seasons.find((s) => s._id === seasonId);
    if (selectedSeason) {
      setSeason(selectedSeason);
      localStorage.setItem('selectedSeason', seasonId);
    }
  };

  const refreshSeasons = async () => {
    if (institution) {
      try {
        const seasonsResponse = await api.get(`/seasons?institution=${institution._id}`);
        setSeasons(seasonsResponse.data);
      } catch (error) {
        console.error('Error refreshing seasons:', error);
      }
    }
  };

  const changeUser = (username) => {
    setUser(username);
    localStorage.setItem('selectedUser', username);
  };

  const loadUsers = async () => {
    if (institution) {
      try {
        const response = await api.get('/users/active', {
          params: { institutionId: institution._id }
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    }
  };

  // Load users when institution changes
  useEffect(() => {
    if (institution) {
      loadUsers();
    }
  }, [institution]);

  const value = {
    user,
    setUser,
    users,
    changeUser,
    loadUsers,
    institution,
    season,
    institutions,
    seasons,
    loading,
    changeInstitution,
    changeSeason,
    refreshSeasons,
    loadInitialData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;

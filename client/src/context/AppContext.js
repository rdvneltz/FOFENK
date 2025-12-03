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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [season, setSeason] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    checkAuth();
  }, []);

  // Check authentication status
  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await api.get('/auth/me');
      const { user } = response.data;

      setIsAuthenticated(true);
      setCurrentUser(user);

      // Load initial data after authentication
      await loadInitialData(user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async (authenticatedUser) => {
    try {
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
        } else {
          // No season available for this institution, clear selection
          setSeason(null);
          localStorage.removeItem('selectedSeason');
        }
      } else {
        // No institution available, clear all
        setInstitution(null);
        setSeason(null);
        setSeasons([]);
        localStorage.removeItem('selectedInstitution');
        localStorage.removeItem('selectedSeason');
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Login function
  const login = (token, user) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setCurrentUser(user);

    // Set institution and load data
    if (user.institution) {
      setInstitution(user.institution);
      localStorage.setItem('selectedInstitution', user.institution._id);
    }

    loadInitialData(user);
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('selectedUser');
      localStorage.removeItem('selectedInstitution');
      localStorage.removeItem('selectedSeason');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUser(null);
      setInstitution(null);
      setSeason(null);
      setInstitutions([]);
      setSeasons([]);
      setUsers([]);
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

        // Auto-select season if none selected or if current season no longer exists
        if (seasonsResponse.data.length > 0) {
          const currentSeasonStillExists = season && seasonsResponse.data.find(s => s._id === season._id);

          if (!currentSeasonStillExists) {
            // Select active season or first season
            const activeSeason = seasonsResponse.data.find(s => s.isActive);
            const selectedSeason = activeSeason || seasonsResponse.data[0];

            if (selectedSeason) {
              setSeason(selectedSeason);
              localStorage.setItem('selectedSeason', selectedSeason._id);
            }
          }
        } else {
          // No seasons available, clear selection
          setSeason(null);
          localStorage.removeItem('selectedSeason');
        }
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
    isAuthenticated,
    currentUser,
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
    login,
    logout,
    checkAuth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;

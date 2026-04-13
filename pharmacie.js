// ===== PharmaGest - Application de Gestion de Pharmacie =====

(function () {
    'use strict';

    // ===== Data Store (localStorage) =====
    function getData(key) {
        try {
            var data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // ===== Toast Notification =====
    function showToast(message, type) {
        var toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show ' + (type || '');
        setTimeout(function () {
            toast.className = 'toast';
        }, 3000);
    }

    // ===== Navigation =====
    var navLinks = document.querySelectorAll('.nav-link');
    var sections = document.querySelectorAll('.content-section');

    function navigateTo(sectionName) {
        sections.forEach(function (s) { s.classList.remove('active'); });
        navLinks.forEach(function (l) { l.classList.remove('active'); });

        var target = document.getElementById('section-' + sectionName);
        if (target) {
            target.classList.add('active');
        }

        navLinks.forEach(function (link) {
            if (link.getAttribute('data-section') === sectionName) {
                link.classList.add('active');
            }
        });

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
    }

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var section = this.getAttribute('data-section');
            navigateTo(section);
            refreshAll();
        });
    });

    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // ===== Medicaments CRUD =====
    var modalMed = document.getElementById('modalMed');
    var formMed = document.getElementById('formMed');

    document.getElementById('btnAddMed').addEventListener('click', function () {
        document.getElementById('modalMedTitle').textContent = 'Ajouter un medicament';
        formMed.reset();
        document.getElementById('medId').value = '';
        document.getElementById('medStockMin').value = '10';
        populateSupplierSelect();
        modalMed.classList.add('show');
    });

    document.getElementById('closeModalMed').addEventListener('click', function () {
        modalMed.classList.remove('show');
    });

    document.getElementById('cancelMed').addEventListener('click', function () {
        modalMed.classList.remove('show');
    });

    formMed.addEventListener('submit', function (e) {
        e.preventDefault();

        var id = document.getElementById('medId').value;
        var medicament = {
            id: id || generateId(),
            nom: document.getElementById('medNom').value.trim(),
            categorie: document.getElementById('medCategorie').value,
            prix: parseInt(document.getElementById('medPrix').value),
            stock: parseInt(document.getElementById('medStock').value),
            stockMin: parseInt(document.getElementById('medStockMin').value) || 10,
            fournisseur: document.getElementById('medFournisseur').value,
            expiration: document.getElementById('medExpiration').value,
            description: document.getElementById('medDescription').value.trim(),
            dateAjout: id ? undefined : new Date().toISOString()
        };

        var medicaments = getData('pharmacie_medicaments');

        if (id) {
            // Update
            var index = medicaments.findIndex(function (m) { return m.id === id; });
            if (index !== -1) {
                medicament.dateAjout = medicaments[index].dateAjout;
                medicaments[index] = medicament;
            }
            showToast('Medicament modifie avec succes', 'success');
        } else {
            // Create
            medicaments.push(medicament);
            showToast('Medicament ajoute avec succes', 'success');
        }

        saveData('pharmacie_medicaments', medicaments);
        modalMed.classList.remove('show');
        refreshAll();
    });

    function editMedicament(id) {
        var medicaments = getData('pharmacie_medicaments');
        var med = medicaments.find(function (m) { return m.id === id; });
        if (!med) return;

        document.getElementById('modalMedTitle').textContent = 'Modifier le medicament';
        document.getElementById('medId').value = med.id;
        document.getElementById('medNom').value = med.nom;
        document.getElementById('medCategorie').value = med.categorie;
        document.getElementById('medPrix').value = med.prix;
        document.getElementById('medStock').value = med.stock;
        document.getElementById('medStockMin').value = med.stockMin;
        populateSupplierSelect();
        document.getElementById('medFournisseur').value = med.fournisseur || '';
        document.getElementById('medExpiration').value = med.expiration;
        document.getElementById('medDescription').value = med.description || '';

        modalMed.classList.add('show');
    }

    function deleteMedicament(id) {
        if (!confirm('Etes-vous sur de vouloir supprimer ce medicament ?')) return;

        var medicaments = getData('pharmacie_medicaments');
        medicaments = medicaments.filter(function (m) { return m.id !== id; });
        saveData('pharmacie_medicaments', medicaments);
        showToast('Medicament supprime', 'error');
        refreshAll();
    }

    function renderMedicaments() {
        var medicaments = getData('pharmacie_medicaments');
        var tbody = document.getElementById('medicamentsBody');
        var searchTerm = document.getElementById('searchMed').value.toLowerCase();
        var filterCat = document.getElementById('filterCategory').value;
        var fournisseurs = getData('pharmacie_fournisseurs');

        var filtered = medicaments.filter(function (m) {
            var matchName = m.nom.toLowerCase().indexOf(searchTerm) !== -1;
            var matchCat = !filterCat || m.categorie === filterCat;
            return matchName && matchCat;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Aucun medicament trouve</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function (med) {
            var stockClass = 'stock-ok';
            var stockText = med.stock;
            if (med.stock === 0) {
                stockClass = 'stock-out';
                stockText = 'Rupture';
            } else if (med.stock <= med.stockMin) {
                stockClass = 'stock-low';
            }

            var fournisseurNom = '-';
            if (med.fournisseur) {
                var f = fournisseurs.find(function (s) { return s.id === med.fournisseur; });
                if (f) fournisseurNom = f.nom;
            }

            var expDate = med.expiration ? new Date(med.expiration).toLocaleDateString('fr-FR') : '-';

            html += '<tr>';
            html += '<td><strong>' + escapeHtml(med.nom) + '</strong></td>';
            html += '<td>' + escapeHtml(med.categorie) + '</td>';
            html += '<td>' + formatNumber(med.prix) + '</td>';
            html += '<td><span class="stock-badge ' + stockClass + '">' + stockText + '</span></td>';
            html += '<td>' + escapeHtml(fournisseurNom) + '</td>';
            html += '<td>' + expDate + '</td>';
            html += '<td>';
            html += '<button class="btn btn-edit btn-sm" onclick="window.pharmaApp.editMed(\'' + med.id + '\')">Modifier</button>';
            html += '<button class="btn btn-danger btn-sm" onclick="window.pharmaApp.deleteMed(\'' + med.id + '\')">Supprimer</button>';
            html += '</td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;
    }

    // Search & filter
    document.getElementById('searchMed').addEventListener('input', renderMedicaments);
    document.getElementById('filterCategory').addEventListener('change', renderMedicaments);

    // ===== Ventes (Sales) =====
    var modalSale = document.getElementById('modalSale');
    var formSale = document.getElementById('formSale');

    document.getElementById('btnAddSale').addEventListener('click', function () {
        populateMedSelect();
        formSale.reset();
        document.getElementById('saleStockInfo').textContent = '-';
        document.getElementById('saleTotal').textContent = '0 FCFA';
        modalSale.classList.add('show');
    });

    document.getElementById('closeModalSale').addEventListener('click', function () {
        modalSale.classList.remove('show');
    });

    document.getElementById('cancelSale').addEventListener('click', function () {
        modalSale.classList.remove('show');
    });

    document.getElementById('saleMed').addEventListener('change', function () {
        var medId = this.value;
        if (!medId) {
            document.getElementById('saleStockInfo').textContent = '-';
            document.getElementById('salePrixUnit').value = '';
            document.getElementById('saleTotal').textContent = '0 FCFA';
            return;
        }

        var medicaments = getData('pharmacie_medicaments');
        var med = medicaments.find(function (m) { return m.id === medId; });
        if (med) {
            document.getElementById('saleStockInfo').textContent = med.stock + ' unites';
            document.getElementById('salePrixUnit').value = med.prix;
            updateSaleTotal();
        }
    });

    document.getElementById('saleQty').addEventListener('input', updateSaleTotal);

    function updateSaleTotal() {
        var qty = parseInt(document.getElementById('saleQty').value) || 0;
        var prix = parseInt(document.getElementById('salePrixUnit').value) || 0;
        document.getElementById('saleTotal').textContent = formatNumber(qty * prix) + ' FCFA';
    }

    formSale.addEventListener('submit', function (e) {
        e.preventDefault();

        var medId = document.getElementById('saleMed').value;
        var qty = parseInt(document.getElementById('saleQty').value);

        if (!medId || !qty) return;

        var medicaments = getData('pharmacie_medicaments');
        var med = medicaments.find(function (m) { return m.id === medId; });

        if (!med) {
            showToast('Medicament non trouve', 'error');
            return;
        }

        if (qty > med.stock) {
            showToast('Stock insuffisant ! Disponible: ' + med.stock, 'error');
            return;
        }

        // Create sale
        var vente = {
            id: generateId(),
            medicamentId: medId,
            medicamentNom: med.nom,
            quantite: qty,
            prixUnitaire: med.prix,
            total: qty * med.prix,
            client: document.getElementById('saleClient').value.trim() || 'Client anonyme',
            date: new Date().toISOString()
        };

        var ventes = getData('pharmacie_ventes');
        ventes.push(vente);
        saveData('pharmacie_ventes', ventes);

        // Update stock
        var medIndex = medicaments.findIndex(function (m) { return m.id === medId; });
        medicaments[medIndex].stock -= qty;
        saveData('pharmacie_medicaments', medicaments);

        modalSale.classList.remove('show');
        showToast('Vente enregistree avec succes', 'success');
        refreshAll();
    });

    function deleteSale(id) {
        if (!confirm('Supprimer cette vente ? Le stock ne sera pas restaure.')) return;

        var ventes = getData('pharmacie_ventes');
        ventes = ventes.filter(function (v) { return v.id !== id; });
        saveData('pharmacie_ventes', ventes);
        showToast('Vente supprimee', 'error');
        refreshAll();
    }

    function renderVentes() {
        var ventes = getData('pharmacie_ventes');
        var tbody = document.getElementById('ventesBody');

        var startDate = document.getElementById('filterDateStart').value;
        var endDate = document.getElementById('filterDateEnd').value;

        var filtered = ventes;
        if (startDate) {
            filtered = filtered.filter(function (v) {
                return v.date >= startDate;
            });
        }
        if (endDate) {
            var end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            filtered = filtered.filter(function (v) {
                return v.date < end.toISOString();
            });
        }

        // Sort by date descending
        filtered.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

        // Update summary
        var totalAmount = filtered.reduce(function (sum, v) { return sum + v.total; }, 0);
        document.getElementById('salesTotalAmount').textContent = formatNumber(totalAmount) + ' FCFA';
        document.getElementById('salesCount').textContent = filtered.length;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">Aucune vente trouvee</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function (v, i) {
            var date = new Date(v.date).toLocaleDateString('fr-FR');
            html += '<tr>';
            html += '<td>' + (i + 1) + '</td>';
            html += '<td>' + escapeHtml(v.medicamentNom) + '</td>';
            html += '<td>' + v.quantite + '</td>';
            html += '<td>' + formatNumber(v.prixUnitaire) + '</td>';
            html += '<td><strong>' + formatNumber(v.total) + '</strong></td>';
            html += '<td>' + escapeHtml(v.client) + '</td>';
            html += '<td>' + date + '</td>';
            html += '<td>';
            html += '<button class="btn btn-danger btn-sm" onclick="window.pharmaApp.deleteSale(\'' + v.id + '\')">Supprimer</button>';
            html += '</td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;
    }

    document.getElementById('btnFilterSales').addEventListener('click', renderVentes);

    // ===== Fournisseurs (Suppliers) =====
    var modalSupplier = document.getElementById('modalSupplier');
    var formSupplier = document.getElementById('formSupplier');

    document.getElementById('btnAddSupplier').addEventListener('click', function () {
        document.getElementById('modalSupplierTitle').textContent = 'Ajouter un fournisseur';
        formSupplier.reset();
        document.getElementById('supplierId').value = '';
        modalSupplier.classList.add('show');
    });

    document.getElementById('closeModalSupplier').addEventListener('click', function () {
        modalSupplier.classList.remove('show');
    });

    document.getElementById('cancelSupplier').addEventListener('click', function () {
        modalSupplier.classList.remove('show');
    });

    formSupplier.addEventListener('submit', function (e) {
        e.preventDefault();

        var id = document.getElementById('supplierId').value;
        var fournisseur = {
            id: id || generateId(),
            nom: document.getElementById('supplierNom').value.trim(),
            telephone: document.getElementById('supplierTel').value.trim(),
            email: document.getElementById('supplierEmail').value.trim(),
            adresse: document.getElementById('supplierAdresse').value.trim()
        };

        var fournisseurs = getData('pharmacie_fournisseurs');

        if (id) {
            var index = fournisseurs.findIndex(function (f) { return f.id === id; });
            if (index !== -1) {
                fournisseurs[index] = fournisseur;
            }
            showToast('Fournisseur modifie avec succes', 'success');
        } else {
            fournisseurs.push(fournisseur);
            showToast('Fournisseur ajoute avec succes', 'success');
        }

        saveData('pharmacie_fournisseurs', fournisseurs);
        modalSupplier.classList.remove('show');
        refreshAll();
    });

    function editSupplier(id) {
        var fournisseurs = getData('pharmacie_fournisseurs');
        var f = fournisseurs.find(function (s) { return s.id === id; });
        if (!f) return;

        document.getElementById('modalSupplierTitle').textContent = 'Modifier le fournisseur';
        document.getElementById('supplierId').value = f.id;
        document.getElementById('supplierNom').value = f.nom;
        document.getElementById('supplierTel').value = f.telephone;
        document.getElementById('supplierEmail').value = f.email || '';
        document.getElementById('supplierAdresse').value = f.adresse || '';

        modalSupplier.classList.add('show');
    }

    function deleteSupplier(id) {
        if (!confirm('Etes-vous sur de vouloir supprimer ce fournisseur ?')) return;

        var fournisseurs = getData('pharmacie_fournisseurs');
        fournisseurs = fournisseurs.filter(function (f) { return f.id !== id; });
        saveData('pharmacie_fournisseurs', fournisseurs);
        showToast('Fournisseur supprime', 'error');
        refreshAll();
    }

    function renderFournisseurs() {
        var fournisseurs = getData('pharmacie_fournisseurs');
        var tbody = document.getElementById('fournisseursBody');

        if (fournisseurs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Aucun fournisseur enregistre</td></tr>';
            return;
        }

        var html = '';
        fournisseurs.forEach(function (f) {
            html += '<tr>';
            html += '<td><strong>' + escapeHtml(f.nom) + '</strong></td>';
            html += '<td>' + escapeHtml(f.telephone) + '</td>';
            html += '<td>' + escapeHtml(f.email || '-') + '</td>';
            html += '<td>' + escapeHtml(f.adresse || '-') + '</td>';
            html += '<td>';
            html += '<button class="btn btn-edit btn-sm" onclick="window.pharmaApp.editSupplier(\'' + f.id + '\')">Modifier</button>';
            html += '<button class="btn btn-danger btn-sm" onclick="window.pharmaApp.deleteSupplier(\'' + f.id + '\')">Supprimer</button>';
            html += '</td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;
    }

    // ===== Alertes =====
    function renderAlertes() {
        var medicaments = getData('pharmacie_medicaments');
        var container = document.getElementById('alertesContainer');
        var dashAlerts = document.getElementById('dashboardAlerts');
        var alertes = [];

        var today = new Date();
        var thirtyDays = new Date();
        thirtyDays.setDate(today.getDate() + 30);

        medicaments.forEach(function (med) {
            // Stock bas
            if (med.stock <= med.stockMin && med.stock > 0) {
                alertes.push({
                    type: 'warning',
                    icon: '&#9888;',
                    message: 'Stock bas: ' + med.nom + ' (' + med.stock + ' restants, minimum: ' + med.stockMin + ')'
                });
            }

            // Rupture de stock
            if (med.stock === 0) {
                alertes.push({
                    type: 'danger',
                    icon: '&#10060;',
                    message: 'Rupture de stock: ' + med.nom
                });
            }

            // Expiration proche
            if (med.expiration) {
                var expDate = new Date(med.expiration);
                if (expDate <= today) {
                    alertes.push({
                        type: 'danger',
                        icon: '&#128197;',
                        message: 'EXPIRE: ' + med.nom + ' (expire le ' + expDate.toLocaleDateString('fr-FR') + ')'
                    });
                } else if (expDate <= thirtyDays) {
                    alertes.push({
                        type: 'warning',
                        icon: '&#128197;',
                        message: 'Expire bientot: ' + med.nom + ' (le ' + expDate.toLocaleDateString('fr-FR') + ')'
                    });
                }
            }
        });

        if (alertes.length === 0) {
            container.innerHTML = '<p class="empty-msg">Aucune alerte - Tout est en ordre !</p>';
            dashAlerts.innerHTML = '<p class="empty-msg">Aucune alerte</p>';
            return;
        }

        var html = '';
        alertes.forEach(function (a) {
            html += '<div class="alert-item alert-' + a.type + '">';
            html += '<span class="alert-icon">' + a.icon + '</span>';
            html += '<span>' + a.message + '</span>';
            html += '</div>';
        });

        container.innerHTML = html;

        // Dashboard alerts (max 5)
        var dashHtml = '';
        alertes.slice(0, 5).forEach(function (a) {
            dashHtml += '<div class="alert-item alert-' + a.type + '">';
            dashHtml += '<span class="alert-icon">' + a.icon + '</span>';
            dashHtml += '<span>' + a.message + '</span>';
            dashHtml += '</div>';
        });
        dashAlerts.innerHTML = dashHtml;
    }

    // ===== Dashboard Stats =====
    function updateDashboard() {
        var medicaments = getData('pharmacie_medicaments');
        var ventes = getData('pharmacie_ventes');

        // Total medicaments
        document.getElementById('totalMedicaments').textContent = medicaments.length;

        // Today's sales
        var today = new Date().toISOString().split('T')[0];
        var todaySales = ventes.filter(function (v) {
            return v.date.split('T')[0] === today;
        });
        document.getElementById('totalVentes').textContent = todaySales.length;

        // Low stock
        var lowStock = medicaments.filter(function (m) {
            return m.stock <= m.stockMin && m.stock > 0;
        });
        document.getElementById('stockBas').textContent = lowStock.length;

        // Expiring soon (30 days)
        var thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        var expiring = medicaments.filter(function (m) {
            if (!m.expiration) return false;
            var expDate = new Date(m.expiration);
            return expDate <= thirtyDays;
        });
        document.getElementById('expireSoon').textContent = expiring.length;

        // Recent sales (last 5)
        var recentBody = document.getElementById('recentSalesBody');
        var recent = ventes.sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        }).slice(0, 5);

        if (recent.length === 0) {
            recentBody.innerHTML = '<tr><td colspan="4" class="empty-msg">Aucune vente enregistree</td></tr>';
        } else {
            var html = '';
            recent.forEach(function (v) {
                var date = new Date(v.date).toLocaleDateString('fr-FR');
                html += '<tr>';
                html += '<td>' + escapeHtml(v.medicamentNom) + '</td>';
                html += '<td>' + v.quantite + '</td>';
                html += '<td>' + formatNumber(v.total) + ' FCFA</td>';
                html += '<td>' + date + '</td>';
                html += '</tr>';
            });
            recentBody.innerHTML = html;
        }
    }

    // ===== Populate Selects =====
    function populateSupplierSelect() {
        var fournisseurs = getData('pharmacie_fournisseurs');
        var select = document.getElementById('medFournisseur');
        var current = select.value;

        select.innerHTML = '<option value="">Aucun</option>';
        fournisseurs.forEach(function (f) {
            var option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.nom;
            select.appendChild(option);
        });

        select.value = current;
    }

    function populateMedSelect() {
        var medicaments = getData('pharmacie_medicaments');
        var select = document.getElementById('saleMed');

        select.innerHTML = '<option value="">Choisir un medicament...</option>';
        medicaments.forEach(function (m) {
            if (m.stock > 0) {
                var option = document.createElement('option');
                option.value = m.id;
                option.textContent = m.nom + ' (stock: ' + m.stock + ')';
                select.appendChild(option);
            }
        });
    }

    // ===== Global Search =====
    document.getElementById('globalSearch').addEventListener('input', function () {
        var term = this.value.toLowerCase().trim();
        if (!term) return;

        // Search in medicaments
        var medicaments = getData('pharmacie_medicaments');
        var found = medicaments.some(function (m) {
            return m.nom.toLowerCase().indexOf(term) !== -1;
        });

        if (found) {
            navigateTo('medicaments');
            document.getElementById('searchMed').value = term;
            renderMedicaments();
        }
    });

    // ===== Utility Functions =====
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // ===== Refresh All Views =====
    function refreshAll() {
        updateDashboard();
        renderMedicaments();
        renderVentes();
        renderFournisseurs();
        renderAlertes();
    }

    // ===== Expose Functions for onclick =====
    window.pharmaApp = {
        editMed: editMedicament,
        deleteMed: deleteMedicament,
        deleteSale: deleteSale,
        editSupplier: editSupplier,
        deleteSupplier: deleteSupplier
    };

    // ===== Initialize =====
    refreshAll();

})();
